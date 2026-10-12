// AI GUIDE: 요구사항 노트 — 전 화면 공통 (석완)
//
// 목업 화면의 기능마다 요구사항을 달아 두고, 분석/설계자가 (!)를 눌러 "이 기능이 왜 있는지"를 보게 합니다.
//   · 평소에는 숨김 — 왼쪽 아래 [요구사항] 버튼으로 '요구사항 보기' 모드를 켜면 (!)가 뜹니다
//   · 작성은 화면에서 기능을 직접 클릭해 고릅니다(다른 담당자 화면 코드를 고치지 않습니다)
//     - 원가조정 'Agent와 대화하기'에서는 "요구사항 작성"으로 대화하며 씁니다(budget-agent-console.js 연동)
//     - 그 외 화면은 [요구사항] 도구막대의 [＋ 추가]로 씁니다
//   · 저장은 이 브라우저(localStorage). 분석/설계자는 서버에 못 들어오므로
//     [공유용 HTML 내보내기]로 화면 + 요구사항을 HTML 한 파일에 담아 전달합니다(받은 파일은 읽기 전용).
//   · [백업] / [불러오기]로 요구사항만 JSON 파일로 옮길 수 있습니다.
//
// (!) 위치 찾기: 고른 요소의 화면 id · 태그 · onclick · 글자 · 클래스를 기억했다가 렌더될 때마다 다시 찾습니다.
// 이 프로젝트는 버튼을 인라인 onclick 으로 다는 규칙이라 onclick 이 가장 믿을 만한 표식입니다.
// (!)는 화면 위에 따로 얹은 층에 그려서 다른 화면의 배치를 건드리지 않습니다.
//
// 불러오기: index.html 편집이 막혀 있어 budget-agent-console.js 끝에서 이 파일을 불러옵니다.
// 클래스 접두사 .rqn-*, 전역 이름 rqn* / REQ_NOTES_*.

(function () {
  if (window.REQ_NOTES_LOADED) return;
  window.REQ_NOTES_LOADED = true;

  var KEY = 'newmis.reqNotes.v1';
  var MODE_KEY = 'newmis.reqNotes.mode';
  var EXPORT = window.REQ_NOTES_EXPORT || null;          // 공유본이면 내보낼 때 담은 데이터
  var READONLY = !!EXPORT;

  /* ── 저장소 ─────────────────────────────────────────────────────────── */
  function load() {
    if (EXPORT) return (EXPORT.items || []).slice();
    try { var j = JSON.parse(localStorage.getItem(KEY) || '{}'); return Array.isArray(j.items) ? j.items : []; }
    catch (e) { return []; }
  }
  function save() {
    if (READONLY) return;
    try { localStorage.setItem(KEY, JSON.stringify({ version: 1, items: state.items })); }
    catch (e) { toast('브라우저 저장공간에 쓰지 못했습니다. [백업]으로 파일을 받아 두세요.'); }
  }
  var state = {
    items: load(),
    on: (function () { try { return localStorage.getItem(MODE_KEY) === 'on'; } catch (e) { return false; } })(),
    pick: null,          // { onDone(anchor) }
    open: '',            // 말풍선 연 요구사항 id
    editor: null,        // { anchor, item }
    list: false,
    chat: null,          // 대화 작성 단계 { step:'pick'|'text', anchor }
  };
  if (READONLY) state.on = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(m) { if (typeof showToast === 'function') showToast(m); }
  function now() {
    var d = new Date(), z = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  }
  function nextId() {
    var max = 0;
    state.items.forEach(function (x) { var n = Number(String(x.id || '').replace(/\D/g, '')); if (n > max) max = n; });
    return 'RQ-' + ('00' + (max + 1)).slice(-3);
  }

  /* ── 요소 기억하기 / 다시 찾기 ───────────────────────────────────────── */
  var PICKABLE = 'button, a, th, label, select, input, textarea, [onclick], .aglb-tabs button, h1, h2, h3, h4, strong, table';
  function textOf(el) { return String(el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 60); }
  // 기능명 기본값 — 탭 번호 · 금액처럼 바뀌는 숫자를 뺀 이름
  function nameOf(a) {
    var t = String((a && a.text) || '').replace(/^\d{1,2}\s+/, '').replace(/[−+-]?[\d,]{4,}(원|MM)?/g, '').replace(/\s+/g, ' ').trim();
    return t || (a && a.tag) || '기능';
  }
  function screenOf(el) { var s = el.closest('.screen'); return s ? s.id : 'global'; }
  function screenTitle(id) {
    try { if (typeof SCREEN_DESC !== 'undefined' && SCREEN_DESC[id]) return SCREEN_DESC[id].menu || SCREEN_DESC[id].title; } catch (e) {}
    return id;
  }
  function context() {
    var c = {};
    try { if (typeof agentAiSheetFinal !== 'undefined' && agentAiSheetFinal) c.sheet = agentAiSheetFinal; } catch (e) {}
    return c;
  }
  function anchorOf(raw) {
    var el = raw.closest(PICKABLE) || raw;
    return {
      screen: screenOf(el),
      route: String(location.hash || '').split('?')[0],
      tag: el.tagName,
      onclick: (el.getAttribute('onclick') || '').trim().slice(0, 160),
      text: textOf(el),
      cls: String(el.className && el.className.baseVal == null ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 3),
      ctx: context(),
    };
  }
  function findEl(a) {
    if (!a) return null;
    var root = a.screen === 'global' ? document : document.getElementById(a.screen);
    if (!root || (root.classList && root.classList.contains('screen') && !root.classList.contains('active'))) return null;
    if (a.ctx && a.ctx.sheet) {
      try { if (typeof agentAiSheetFinal !== 'undefined' && agentAiSheetFinal !== a.ctx.sheet) return null; } catch (e) {}
    }
    var list = root.querySelectorAll(a.tag || '*');
    var best = null, bestScore = 0;
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.closest('.rqn-ui')) continue;
      var sc = 0;
      var oc = (el.getAttribute('onclick') || '').trim().slice(0, 160);
      if (a.onclick && oc === a.onclick) sc += 6;
      var t = textOf(el);
      if (a.text && t === a.text) sc += 4;
      else if (a.text && t && (t.indexOf(a.text) === 0 || a.text.indexOf(t) === 0)) sc += 2;
      (a.cls || []).forEach(function (c) { if (el.classList && el.classList.contains(c)) sc += 1; });
      if (sc > bestScore) { bestScore = sc; best = el; }
    }
    return bestScore >= 4 ? best : null;
  }

  /* ── 문장 다듬기 — "~할 수 있어야 한다" 톤 ─────────────────────────── */
  function polishOne(s) {
    s = String(s || '').replace(/^\s*[-·•*\d.)]+\s*/, '').replace(/\s+/g, ' ').trim().replace(/[.。]+$/, '');
    if (!s) return '';
    if (/(할 수 있어야 한다|해야 한다|되어야 한다|돼야 한다|않아야 한다|없어야 한다)$/.test(s)) return s + '.';
    if (/해야한다$/.test(s)) return s.replace(/해야한다$/, '해야 한다') + '.';
    if (/하기$/.test(s)) return s.replace(/하기$/, '할 수 있어야 한다') + '.';
    if (/(한다|합니다)$/.test(s)) return s.replace(/(한다|합니다)$/, '할 수 있어야 한다') + '.';
    if (/(된다|됩니다|됨)$/.test(s)) return s.replace(/(된다|됩니다|됨)$/, '되어야 한다') + '.';
    if (/(않음|않는다|않습니다)$/.test(s)) return s.replace(/(않음|않는다|않습니다)$/, '않아야 한다') + '.';
    if (/함$/.test(s)) return s.replace(/함$/, '해야 한다') + '.';
    if (/(있다|있음)$/.test(s)) return s.replace(/(있다|있음)$/, '있어야 한다') + '.';
    if (/(없다|없음)$/.test(s)) return s.replace(/(없다|없음)$/, '없어야 한다') + '.';
    return s + ' 기능을 제공해야 한다.';
  }
  function parseInput(text) {
    var purpose = '', reqs = [];
    String(text || '').split(/\n|;|；|(?<=[.。])\s+/).forEach(function (line) {
      var l = line.trim();
      if (!l) return;
      var m = l.match(/^목적\s*[:：]\s*(.+)$/);
      if (m) { purpose = m[1].trim().replace(/[.。]+$/, ''); return; }
      var p = polishOne(l.replace(/^요구사항\s*[:：]\s*/, ''));
      if (p) reqs.push(p);
    });
    return { purpose: purpose, reqs: reqs };
  }
  window.rqnPolishFinal = function (t) { return parseInput(t).reqs; };

  /* ── 요구사항 추가/수정/삭제 ─────────────────────────────────────────── */
  function upsert(item) {
    var i = state.items.findIndex(function (x) { return x.id === item.id; });
    if (i >= 0) state.items[i] = item; else state.items.push(item);
    save();
  }
  function remove(id) {
    state.items = state.items.filter(function (x) { return x.id !== id; });
    save();
  }

  /* ── 기능 고르기 모드 ───────────────────────────────────────────────── */
  var hoverEl = null;
  function startPick(onDone) {
    state.pick = { onDone: onDone };
    state.open = '';
    document.body.classList.add('rqn-picking');
    paint();
    toast('요구사항을 달 기능을 화면에서 클릭하세요. (Esc = 취소)');
  }
  function endPick() {
    state.pick = null;
    document.body.classList.remove('rqn-picking');
    if (hoverEl) { hoverEl.classList.remove('rqn-hover'); hoverEl = null; }
  }
  document.addEventListener('mouseover', function (e) {
    if (!state.pick || e.target.closest('.rqn-ui')) return;
    var el = e.target.closest(PICKABLE) || e.target;
    if (hoverEl === el) return;
    if (hoverEl) hoverEl.classList.remove('rqn-hover');
    hoverEl = el; el.classList.add('rqn-hover');
  }, true);
  document.addEventListener('click', function (e) {
    if (!state.pick || e.target.closest('.rqn-ui')) return;
    e.preventDefault(); e.stopPropagation();
    var a = anchorOf(e.target);
    var cb = state.pick.onDone;
    endPick();
    cb(a);
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (state.pick) {
      endPick();
      if (state.chat) { chatSay('요구사항 작성을 취소했습니다.'); state.chat = null; rerenderApp(); }
      paint(); return;
    }
    if (state.open || state.editor || state.list) { state.open = ''; state.editor = null; state.list = false; paint(); }
  });

  /* ── 화면 그리기 ─────────────────────────────────────────────────────── */
  var root = document.createElement('div');
  root.className = 'rqn-ui';
  document.body.appendChild(root);
  var layer = document.createElement('div');
  layer.className = 'rqn-ui rqn-layer';
  document.body.appendChild(layer);

  function badges() {
    if (!state.on || state.pick) { layer.innerHTML = ''; return; }
    var vw = window.innerWidth, vh = window.innerHeight, html = '';
    var byEl = [];
    state.items.forEach(function (x) {
      var el = findEl(x.anchor);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return;
      var hit = byEl.find(function (b) { return b.el === el; });
      if (hit) { hit.ids.push(x.id); return; }
      byEl.push({ el: el, r: r, ids: [x.id] });
    });
    byEl.forEach(function (b) {
      var left = Math.min(Math.max(b.r.right - 9, 2), vw - 22), top = Math.max(b.r.top - 9, 2);
      html += '<button class="rqn-badge' + (b.ids.indexOf(state.open) >= 0 ? ' on' : '') + '" style="left:' + left + 'px;top:' + top + 'px"'
        + ' title="요구사항 ' + b.ids.join(', ') + '" onclick="rqnOpenFinal(\'' + b.ids[0] + '\')">!'
        + (b.ids.length > 1 ? '<i>' + b.ids.length + '</i>' : '') + '</button>';
    });
    layer.innerHTML = html;
  }

  function itemCard(x, allIds) {
    var el = findEl(x.anchor);
    var r = el ? el.getBoundingClientRect() : null;
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = Math.min(380, vw - 24);
    var left = r ? Math.min(Math.max(r.right - w + 12, 12), vw - w - 12) : (vw - w) / 2;
    var top = r ? (r.bottom + 8 + 260 > vh ? Math.max(r.top - 8 - 260, 12) : r.bottom + 8) : 80;
    var sibs = allIds && allIds.length > 1 ? '<div class="rqn-sibs">' + allIds.map(function (id) {
      return '<button class="' + (id === x.id ? 'on' : '') + '" onclick="rqnOpenFinal(\'' + id + '\')">' + esc(id) + '</button>';
    }).join('') + '</div>' : '';
    return '<div class="rqn-pop" style="left:' + left + 'px;top:' + top + 'px;width:' + w + 'px" role="dialog" aria-label="요구사항 ' + esc(x.id) + '">'
      + '<div class="rqn-pop-head"><em>' + esc(x.id) + '</em><b>' + esc(x.title || x.anchor.text || '기능') + '</b>'
      + '<button class="rqn-x" onclick="rqnCloseFinal()" aria-label="닫기">✕</button></div>'
      + sibs
      + '<div class="rqn-where">' + esc(screenTitle(x.anchor.screen)) + (x.anchor.ctx && x.anchor.ctx.sheet ? ' · ' + esc(x.anchor.ctx.sheet) + ' 상세' : '') + '</div>'
      + (x.purpose ? '<div class="rqn-sec"><span>목적</span><p>' + esc(x.purpose) + '</p></div>' : '')
      + '<div class="rqn-sec"><span>요구사항</span><ol>' + (x.reqs || []).map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>'
      + '<div class="rqn-meta">' + esc(x.author || '') + (x.updatedAt ? ' · ' + esc(x.updatedAt) : '') + '</div>'
      + (READONLY ? '' : '<div class="rqn-acts"><button onclick="rqnEditFinal(\'' + x.id + '\')">수정</button>'
        + '<button class="del" onclick="rqnDeleteFinal(\'' + x.id + '\')">삭제</button></div>')
      + '</div>';
  }

  function editorHtml() {
    var e = state.editor, x = e.item || {};
    return '<div class="rqn-dim" onclick="if(event.target===this)rqnEditorCloseFinal()">'
      + '<div class="rqn-modal" role="dialog" aria-label="요구사항 ' + (e.item ? '수정' : '작성') + '">'
      + '<div class="rqn-modal-head"><b>요구사항 ' + (e.item ? '수정 · ' + esc(x.id) : '작성') + '</b>'
      + '<span>' + esc(screenTitle(e.anchor.screen)) + (e.anchor.ctx && e.anchor.ctx.sheet ? ' · ' + esc(e.anchor.ctx.sheet) + ' 상세' : '') + ' › ' + esc(e.anchor.text || e.anchor.tag) + '</span>'
      + '<button class="rqn-x" onclick="rqnEditorCloseFinal()" aria-label="닫기">✕</button></div>'
      + '<label><span>기능명</span><input id="rqn-f-title" value="' + esc(x.title || nameOf(e.anchor)) + '"></label>'
      + '<label><span>목적 — 이 기능이 왜 필요한가</span><textarea id="rqn-f-purpose" rows="2">' + esc(x.purpose || '') + '</textarea></label>'
      + '<label><span>요구사항 — 한 줄에 하나씩</span><textarea id="rqn-f-reqs" rows="5" placeholder="예: 이관 구분을 받을/보낼 두 가지로 등록한다">' + esc((x.reqs || []).join('\n')) + '</textarea></label>'
      + '<div class="rqn-modal-foot"><button class="ghost" onclick="rqnPolishFieldFinal()">문장 다듬기</button>'
      + '<button class="ok" onclick="rqnEditorSaveFinal()">' + (e.item ? '수정 저장' : '저장') + '</button>'
      + '<button class="ghost" onclick="rqnEditorCloseFinal()">닫음</button></div>'
      + '</div></div>';
  }

  function listHtml() {
    var groups = {};
    state.items.forEach(function (x) {
      var k = screenTitle(x.anchor.screen) + (x.anchor.ctx && x.anchor.ctx.sheet ? ' · ' + x.anchor.ctx.sheet + ' 상세' : '');
      (groups[k] = groups[k] || []).push(x);
    });
    var keys = Object.keys(groups);
    return '<div class="rqn-dim" onclick="if(event.target===this)rqnListFinal(false)">'
      + '<div class="rqn-modal wide" role="dialog" aria-label="요구사항 목록">'
      + '<div class="rqn-modal-head"><b>요구사항 목록</b><span>' + state.items.length + '건' + (READONLY ? ' · 공유본(읽기 전용)' + (EXPORT.exportedAt ? ' · ' + esc(EXPORT.exportedAt) + ' 기준' : '') : '') + '</span>'
      + '<button class="rqn-x" onclick="rqnListFinal(false)" aria-label="닫기">✕</button></div>'
      + '<div class="rqn-list">' + (keys.length ? keys.map(function (k) {
        return '<div class="rqn-grp"><h4>' + esc(k) + '</h4>' + groups[k].map(function (x) {
          return '<div class="rqn-row"><em>' + esc(x.id) + '</em><div><b>' + esc(x.title || x.anchor.text) + '</b>'
            + (x.purpose ? '<p class="p">' + esc(x.purpose) + '</p>' : '')
            + '<ol>' + (x.reqs || []).map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div>'
            + '<button onclick="rqnGoFinal(\'' + x.id + '\')">화면에서 보기</button></div>';
        }).join('') + '</div>';
      }).join('') : '<div class="rqn-empty">아직 요구사항이 없습니다.' + (READONLY ? '' : ' [＋ 추가]로 기능을 골라 작성해 주세요.') + '</div>') + '</div>'
      + '</div></div>';
  }

  function paint() {
    var bar = '';
    if (state.on) {
      bar = READONLY
        ? '<div class="rqn-bar"><span class="rqn-ro">공유본 · 읽기 전용</span><button onclick="rqnListFinal(true)">목록 ' + state.items.length + '</button></div>'
        : '<div class="rqn-bar">'
          + '<button class="add" onclick="rqnAddFinal()">＋ 추가</button>'
          + '<button onclick="rqnListFinal(true)">목록 ' + state.items.length + '</button>'
          + '<button onclick="rqnBackupFinal()">백업</button>'
          + '<button onclick="rqnImportFinal()">불러오기</button>'
          + '<button class="exp" onclick="rqnExportHtmlFinal()">공유용 HTML 내보내기</button>'
          + '</div>';
    }
    var openItem = state.open ? state.items.find(function (x) { return x.id === state.open; }) : null;
    var sibs = [];
    if (openItem) {
      var el = findEl(openItem.anchor);
      state.items.forEach(function (x) { if (findEl(x.anchor) === el) sibs.push(x.id); });
    }
    root.innerHTML = '<div class="rqn-dock' + (state.on ? ' on' : '') + '">'
      + '<button class="rqn-toggle" onclick="rqnToggleFinal()" title="요구사항 보기 ' + (state.on ? '끄기' : '켜기') + '">'
      + '<b>!</b>요구사항' + (state.items.length ? '<i>' + state.items.length + '</i>' : '') + '</button>' + bar + '</div>'
      + (state.pick ? '<div class="rqn-pickbar">요구사항을 달 기능을 클릭하세요 <button onclick="rqnPickCancelFinal()">취소 (Esc)</button></div>' : '')
      + (openItem ? itemCard(openItem, sibs) : '')
      + (state.editor ? editorHtml() : '')
      + (state.list ? listHtml() : '');
    badges();
  }

  /* 렌더 · 스크롤 · 크기 변화 때 (!) 위치를 다시 잡습니다 */
  var queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; if (state.on) { badges(); if (state.open) paint(); } });
  }
  new MutationObserver(function (ms) {
    if (!state.on) return;
    for (var i = 0; i < ms.length; i++) { if (!(ms[i].target.closest && ms[i].target.closest('.rqn-ui'))) { queue(); return; } }
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('scroll', queue, true);
  window.addEventListener('resize', queue);
  window.addEventListener('hashchange', function () { state.open = ''; queue(); });

  function rerenderApp() { try { if (typeof renderBudgetPage === 'function' && document.getElementById('s-budget') && document.getElementById('s-budget').classList.contains('active')) renderBudgetPage(); } catch (e) {} }

  /* ── 버튼 핸들러 ─────────────────────────────────────────────────────── */
  window.rqnToggleFinal = function () {
    if (READONLY) { state.on = !state.on; paint(); return; }
    state.on = !state.on;
    state.open = '';
    try { localStorage.setItem(MODE_KEY, state.on ? 'on' : 'off'); } catch (e) {}
    paint();
  };
  window.rqnOpenFinal = function (id) { state.open = state.open === id ? '' : id; paint(); };
  window.rqnCloseFinal = function () { state.open = ''; paint(); };
  window.rqnAddFinal = function () {
    startPick(function (a) { state.editor = { anchor: a, item: null }; paint(); });
  };
  window.rqnPickCancelFinal = function () {
    endPick();
    if (state.chat) { chatSay('요구사항 작성을 취소했습니다.'); state.chat = null; rerenderApp(); }
    paint();
  };
  window.rqnEditFinal = function (id) {
    var x = state.items.find(function (y) { return y.id === id; });
    if (!x) return;
    state.open = ''; state.editor = { anchor: x.anchor, item: x }; paint();
  };
  window.rqnDeleteFinal = function (id) {
    if (!confirm(id + ' 요구사항을 삭제할까요?')) return;
    remove(id); state.open = ''; paint(); toast(id + ' 요구사항을 삭제했습니다.');
  };
  window.rqnEditorCloseFinal = function () { state.editor = null; paint(); };
  window.rqnPolishFieldFinal = function () {
    var f = document.getElementById('rqn-f-reqs');
    if (f) f.value = parseInput(f.value).reqs.join('\n');
  };
  window.rqnEditorSaveFinal = function () {
    var e = state.editor; if (!e) return;
    var v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var reqs = parseInput(v('rqn-f-reqs')).reqs;
    if (!reqs.length) { toast('요구사항을 한 줄 이상 입력해 주세요.'); return; }
    var item = Object.assign({}, e.item || { id: nextId(), anchor: e.anchor, author: '석완' },
      { title: v('rqn-f-title') || nameOf(e.anchor), purpose: v('rqn-f-purpose'), reqs: reqs, updatedAt: now() });
    upsert(item);
    state.editor = null;
    state.on = true;
    try { localStorage.setItem(MODE_KEY, 'on'); } catch (er) {}
    paint();
    toast(item.id + ' 요구사항을 저장했습니다.');
  };
  window.rqnListFinal = function (on) { state.list = !!on; state.open = ''; paint(); };
  window.rqnGoFinal = function (id) {
    var x = state.items.find(function (y) { return y.id === id; });
    if (!x) return;
    state.list = false;
    var a = x.anchor;
    if (a.route && String(location.hash || '').split('?')[0] !== a.route) location.hash = a.route;
    setTimeout(function () {
      try {
        if (a.ctx && a.ctx.sheet && typeof agentAiSheetFinal !== 'undefined' && agentAiSheetFinal !== a.ctx.sheet
            && typeof agentAiSheetOpenFinal === 'function') agentAiSheetOpenFinal(a.ctx.sheet);
      } catch (e) {}
      setTimeout(function () {
        var el = findEl(a);
        if (el) { el.scrollIntoView({ block: 'center' }); state.open = id; }
        else toast('이 화면에서 기능을 찾지 못했습니다. 탭·소계정을 직접 열어 주세요.');
        state.on = true; paint();
      }, 250);
    }, 350);
  };
  window.rqnBackupFinal = function () {
    download('NewMIS_요구사항_' + now().slice(0, 10) + '.json',
      JSON.stringify({ version: 1, exportedAt: now(), items: state.items }, null, 2), 'application/json');
  };
  window.rqnImportFinal = function () {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(rd.result);
          var list = Array.isArray(j) ? j : (j.items || []);
          if (!list.length) { toast('불러올 요구사항이 없습니다.'); return; }
          if (!confirm('요구사항 ' + list.length + '건을 불러옵니다. 같은 번호는 파일 내용으로 바꿉니다. 계속할까요?')) return;
          list.forEach(function (x) { if (x && x.id && x.anchor) upsert(x); });
          paint(); toast('요구사항 ' + list.length + '건을 불러왔습니다.');
        } catch (e) { toast('요구사항 파일을 읽지 못했습니다.'); }
      };
      rd.readAsText(f, 'utf-8');
    };
    inp.click();
  };
  function download(name, text, type) {
    var b = new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ── 공유용 HTML 내보내기 ─────────────────────────────────────────────
     지금 서버가 내주는 index.html 을 받아, 화면 CSS · JS 를 모두 안에 넣고
     요구사항 · 화면에 필요한 서버 데이터(/api/risks)를 함께 담은 HTML 한 파일을 만듭니다.
     받은 사람은 서버 없이 파일을 열어 보며, 요구사항은 읽기 전용입니다. */
  window.rqnExportHtmlFinal = async function () {
    if (READONLY) return;
    if (!/^https?:/.test(location.protocol)) { toast('서버에서 연 화면에서만 내보낼 수 있습니다.'); return; }
    toast('공유용 HTML을 만드는 중입니다…');
    try {
      var base = location.origin;
      var get = function (u) { return fetch(new URL(u, base).href, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.text(); }); };
      var same = function (u) { try { return new URL(u, base).origin === base; } catch (e) { return false; } };
      var src = await get('/');
      var doc = new DOMParser().parseFromString(src, 'text/html');

      var links = Array.prototype.slice.call(doc.querySelectorAll('link[rel~="stylesheet"][href]'));
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href');
        if (!same(href)) continue;
        var st = doc.createElement('style');
        st.textContent = await get(href);
        links[i].replaceWith(st);
      }
      var scripts = Array.prototype.slice.call(doc.querySelectorAll('script[src]'));
      for (var k = 0; k < scripts.length; k++) {
        var s = scripts[k].getAttribute('src');
        if (!same(s)) continue;
        var n = doc.createElement('script');
        n.textContent = (await get(s)).replace(/<\/script/gi, '<\\/script');
        scripts[k].replaceWith(n);
      }
      var imgs = Array.prototype.slice.call(doc.querySelectorAll('img[src]'));
      for (var m = 0; m < imgs.length; m++) {
        var isrc = imgs[m].getAttribute('src');
        if (!same(isrc) || /^data:/.test(isrc)) continue;
        try {
          var blob = await fetch(new URL(isrc, base).href).then(function (r) { return r.blob(); });
          imgs[m].setAttribute('src', await new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(blob); }));
        } catch (e) {}
      }
      // 이 파일(요구사항 노트)을 맨 끝에 넣습니다 — 원본에서는 다른 스크립트가 불러오기 때문입니다.
      var me = doc.createElement('script');
      me.textContent = (await get('/js/req-notes.js')).replace(/<\/script/gi, '<\\/script');
      doc.body.appendChild(me);

      var risks = [];
      try { risks = await fetch(base + '/api/risks', { cache: 'no-store' }).then(function (r) { return r.json(); }); } catch (e) {}
      var data = { items: state.items, exportedAt: now(), author: '석완' };
      var boot = doc.createElement('script');
      boot.textContent = ('/* [공유본] 서버 없이 여는 파일입니다. 요구사항은 읽기 전용입니다. */\n'
        + 'window.REQ_NOTES_INLINE = true;\n'
        + 'window.REQ_NOTES_EXPORT = ' + JSON.stringify(data) + ';\n'
        + '(function () {\n'
        + '  var RISKS = ' + JSON.stringify(risks) + ';\n'
        + '  var real = window.fetch ? window.fetch.bind(window) : null;\n'
        + '  function res(o) { return Promise.resolve(new Response(JSON.stringify(o), { status: 200, headers: { "Content-Type": "application/json" } })); }\n'
        + '  window.fetch = function (url, opts) {\n'
        + '    var u = String(url || ""); var m = ((opts && opts.method) || "GET").toUpperCase();\n'
        + '    if (u.indexOf("/api/") < 0) return real ? real(url, opts) : Promise.reject(new Error("offline"));\n'
        + '    if (/\\/api\\/risks\\/?$/.test(u.split("?")[0]) && m === "GET") return res(RISKS);\n'
        + '    return res({ ok: false, offline: true, answer: "이 파일은 서버 없이 여는 공유본이라 AI 응답은 사용할 수 없습니다." });\n'
        + '  };\n'
        + '})();\n').replace(/<\/script/gi, '<\\/script');
      doc.head.insertBefore(boot, doc.head.firstChild);

      var html = '<!doctype html>\n' + doc.documentElement.outerHTML;
      download('NewMIS_요구사항공유_' + now().slice(0, 10) + '.html', html, 'text/html');
      toast('공유용 HTML을 내려받았습니다 — 요구사항 ' + state.items.length + '건 포함, 받은 사람은 더블클릭으로 엽니다.');
    } catch (e) {
      toast('내보내기에 실패했습니다: ' + (e && e.message ? e.message : e));
    }
  };

  /* ── 'Agent와 대화하기' 연동 (원가조정 Agent 콘솔) ─────────────────────
     "요구사항 작성" → 화면에서 기능 클릭 → 대화로 목적 · 요구사항 입력 → 다듬어 저장 */
  function chatSay(text) {
    try { if (typeof AGENT_CHAT_FINAL !== 'undefined') AGENT_CHAT_FINAL.push({ who: 'agent', text: text }); } catch (e) {}
  }
  window.rqnChatHandleFinal = function (q) {
    if (READONLY) return false;
    var t = String(q || '').trim();
    if (state.chat && state.chat.step === 'text') {
      if (/^(취소|그만)$/.test(t)) { state.chat = null; chatSay('요구사항 작성을 취소했습니다.'); return true; }
      var p = parseInput(t);
      if (!p.reqs.length) { chatSay('요구사항 문장을 찾지 못했습니다. 목적 뒤에 마침표(.)를 찍고 요구사항을 이어 적어 주세요. (취소하려면 "취소")'); return true; }
      var a = state.chat.anchor;
      var item = { id: nextId(), anchor: a, author: '석완', title: nameOf(a), purpose: p.purpose, reqs: p.reqs, updatedAt: now() };
      upsert(item);
      state.chat = null;
      state.on = true;
      try { localStorage.setItem(MODE_KEY, 'on'); } catch (e) {}
      chatSay(item.id + ' 요구사항을 저장했습니다 — ' + item.title + '\n'
        + (item.purpose ? '목적: ' + item.purpose + '\n' : '')
        + item.reqs.map(function (r, i) { return (i + 1) + '. ' + r; }).join('\n')
        + '\n화면의 (!)를 누르면 보이고, 거기서 고칠 수 있습니다.');
      setTimeout(paint, 0);
      return true;
    }
    if (/^요구사항\s*(작성|추가|등록|쓰기)?/.test(t) && t.length <= 12) {
      state.chat = { step: 'pick' };
      chatSay('요구사항을 달 기능을 화면에서 클릭해 주세요. 버튼 · 탭 · 표 머리 어디든 됩니다. (Esc = 취소)');
      setTimeout(function () {
        startPick(function (a) {
          state.chat = { step: 'text', anchor: a };
          chatSay('"' + nameOf(a) + '"' + (a.ctx && a.ctx.sheet ? ' (' + a.ctx.sheet + ' 상세)' : '') + ' 기능을 골랐습니다.\n'
            + '이 기능의 요구사항을 말씀해 주세요. 여러 개는 마침표(.)나 ;로 나누고, 목적은 "목적: …"으로 적어 주세요.\n'
            + '예) 목적: 다른 프로젝트와 주고받는 인건비를 계획한다. 받을/보낼 두 구분으로 등록한다; 실적이 생긴 건은 수정할 수 없음');
          rerenderApp();
          setTimeout(function () { var el = document.getElementById('agent-chat-input'); if (el) el.focus(); }, 60);
        });
      }, 0);
      return true;
    }
    return false;
  };
  window.rqnChatActiveFinal = function () { return !!state.chat; };

  /* ── 스타일 ──────────────────────────────────────────────────────────── */
  var css = document.createElement('style');
  css.id = 'rqn-style';
  css.textContent = [
    '.rqn-layer{position:fixed;inset:0;pointer-events:none;z-index:9000}',
    '.rqn-badge{position:fixed;pointer-events:auto;width:20px;height:20px;border-radius:50%;border:2px solid #fff;background:#ea002c;color:#fff;',
    ' font:900 12px/16px system-ui,sans-serif;text-align:center;padding:0;cursor:pointer;box-shadow:0 2px 6px rgba(15,23,42,.35)}',
    '.rqn-badge:hover,.rqn-badge.on{background:#b8001f;transform:scale(1.12)}',
    '.rqn-badge i{position:absolute;right:-7px;top:-7px;min-width:14px;height:14px;border-radius:7px;background:#1c2432;font:900 9px/14px system-ui;font-style:normal}',
    '.rqn-dock{position:fixed;left:12px;bottom:12px;z-index:9100;display:flex;align-items:center;gap:6px;flex-wrap:wrap;max-width:calc(100vw - 24px)}',
    '.rqn-toggle{display:inline-flex;align-items:center;gap:6px;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:999px;',
    ' padding:6px 12px 6px 7px;font:800 12px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(15,23,42,.14)}',
    '.rqn-toggle b{width:18px;height:18px;border-radius:50%;background:#94a3b8;color:#fff;font:900 11px/18px system-ui;text-align:center}',
    '.rqn-dock.on .rqn-toggle{border-color:#ea002c;color:#ea002c}.rqn-dock.on .rqn-toggle b{background:#ea002c}',
    '.rqn-toggle i{font-style:normal;font-size:11px;color:#64748b}',
    '.rqn-bar{display:inline-flex;gap:4px;padding:4px;border:1px solid #e2e8f0;background:#fff;border-radius:999px;box-shadow:0 4px 14px rgba(15,23,42,.14)}',
    '.rqn-bar button{border:0;background:#f1f5f9;color:#334155;border-radius:999px;padding:5px 10px;font:800 11.5px system-ui,sans-serif;cursor:pointer;white-space:nowrap}',
    '.rqn-bar button:hover{background:#e2e8f0}.rqn-bar button.add{background:#1c2432;color:#fff}.rqn-bar button.exp{background:#ea002c;color:#fff}',
    '.rqn-ro{padding:5px 8px;font:800 11.5px system-ui;color:#64748b}',
    'body.rqn-picking *{cursor:crosshair!important}',
    '.rqn-hover{outline:2px dashed #ea002c!important;outline-offset:2px!important}',
    '.rqn-pickbar{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:9200;background:#1c2432;color:#fff;border-radius:999px;',
    ' padding:8px 8px 8px 16px;font:800 12.5px system-ui,sans-serif;display:flex;align-items:center;gap:10px;box-shadow:0 6px 20px rgba(15,23,42,.3)}',
    '.rqn-pickbar button{border:0;background:#fff;color:#1c2432;border-radius:999px;padding:5px 11px;font:800 11.5px system-ui;cursor:pointer}',
    '.rqn-pop{position:fixed;z-index:9150;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 14px 40px rgba(15,23,42,.22);',
    ' padding:12px 14px;font-family:system-ui,sans-serif;max-height:70vh;overflow:auto}',
    '.rqn-pop-head{display:flex;align-items:center;gap:8px}',
    '.rqn-pop-head em,.rqn-row em{font-style:normal;font-size:10.5px;font-weight:900;color:#fff;background:#ea002c;border-radius:5px;padding:2px 6px;flex:0 0 auto}',
    '.rqn-pop-head b{font-size:14px;font-weight:900;color:#0b1220}',
    '.rqn-x{margin-left:auto;border:0;background:transparent;color:#94a3b8;font-size:14px;cursor:pointer}',
    '.rqn-sibs{display:flex;gap:4px;margin:8px 0 0}.rqn-sibs button{border:1px solid #e2e8f0;background:#fff;border-radius:6px;font:800 10.5px system-ui;padding:2px 6px;cursor:pointer}',
    '.rqn-sibs button.on{border-color:#ea002c;color:#ea002c}',
    '.rqn-where{margin:6px 0 0;font-size:11px;color:#94a3b8}',
    '.rqn-sec{margin:10px 0 0}.rqn-sec span{display:block;font-size:11px;font-weight:900;color:#64748b;margin-bottom:3px}',
    '.rqn-sec p{margin:0;font-size:12.5px;line-height:1.55;color:#334155}',
    '.rqn-sec ol,.rqn-row ol{margin:0;padding-left:18px}.rqn-sec li,.rqn-row li{font-size:12.5px;line-height:1.55;color:#1c2432}',
    '.rqn-meta{margin:10px 0 0;font-size:10.5px;color:#94a3b8}',
    '.rqn-acts{display:flex;gap:6px;justify-content:flex-end;margin-top:8px}',
    '.rqn-acts button{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:4px 10px;font:800 11.5px system-ui;cursor:pointer;color:#334155}',
    '.rqn-acts button.del{color:#c40025;border-color:#f3c2cc}',
    '.rqn-dim{position:fixed;inset:0;z-index:9300;background:rgba(15,23,42,.38);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.rqn-modal{width:min(560px,100%);max-height:calc(100vh - 32px);overflow:auto;background:#fff;border-radius:16px;padding:16px 18px;',
    ' font-family:system-ui,sans-serif;box-shadow:0 20px 50px rgba(15,23,42,.3)}',
    '.rqn-modal.wide{width:min(860px,100%)}',
    '.rqn-modal-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.rqn-modal-head b{font-size:15px;font-weight:900;color:#0b1220}.rqn-modal-head span{font-size:12px;color:#64748b}',
    '.rqn-modal label{display:flex;flex-direction:column;gap:5px;margin:0 0 10px}',
    '.rqn-modal label span{font-size:11.5px;font-weight:800;color:#64748b}',
    '.rqn-modal input,.rqn-modal textarea{border:1px solid #cbd5e1;border-radius:9px;padding:8px 10px;font:13px/1.5 system-ui,sans-serif;color:#1c2432;resize:vertical}',
    '.rqn-modal-foot{display:flex;gap:6px;justify-content:flex-end}',
    '.rqn-modal-foot button{border:1px solid #cbd5e1;background:#fff;border-radius:9px;padding:7px 14px;font:800 12.5px system-ui;cursor:pointer;color:#334155}',
    '.rqn-modal-foot button.ok{background:#ea002c;border-color:#ea002c;color:#fff}',
    '.rqn-grp+.rqn-grp{margin-top:14px}.rqn-grp h4{margin:0 0 6px;font-size:12px;font-weight:900;color:#64748b}',
    '.rqn-row{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid #eef1f6}',
    '.rqn-row>div{flex:1 1 auto;min-width:0}.rqn-row b{font-size:13px;font-weight:900;color:#0b1220}',
    '.rqn-row p.p{margin:2px 0 4px;font-size:12px;color:#64748b}',
    '.rqn-row button{flex:0 0 auto;border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:4px 9px;font:800 11px system-ui;cursor:pointer}',
    '.rqn-empty{padding:24px;text-align:center;color:#94a3b8;font-size:12.5px}',
    '@media (max-width:640px){.rqn-bar{flex-wrap:wrap;border-radius:12px}}',
  ].join('\n');
  document.head.appendChild(css);

  paint();
})();
