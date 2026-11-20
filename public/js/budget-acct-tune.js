// ════════════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 — 계정 상세 다듬기(계정 색 맞추기 · 경비 도구줄 · 경비 세부계정 고르기)      작성: 남주
//  공유 렌더러는 고치지 않고 그려진 화면을 뒤에서 다듬습니다(budget-os-cards.js 뒤에 로드, 여러 번 불려도 같은 결과).
//
//   ① 표 줄 사이 노란 선 — 다른 화면용 테마(initiation-extra2.css)가 모든 표 칸 테두리를 주황빛(#ffedd5 !important)으로 바꿔서
//      원가조정 표에도 걸려 있었음 → 원가조정(Agent 화면) 안의 표만 연회색 선으로
//   ② 표 안 진행 막대(.agos-bar — 경비 연간 예산 등)가 예전 주황(#f5a623) → 보고 있는 계정 색(--acc)
//   ③ 경비 도구줄: 다른 계정은 버튼이 오른쪽인데 경비만 왼쪽에 붙어 있었음(엑셀 버튼을 [⋯ 더보기]로 숨기며 오른쪽 밀기가 사라짐)
//      → 연도 탭은 왼쪽, [⋯ 더보기] · [＋ 경비 편성] · [저장]은 오른쪽
//   ④ 경비 편성 「세부계정」 고르기: 기본 드롭다운(optgroup) → 중분류별 묶음 버튼 + 찾기. 고르면 원래 드롭다운 값을 바꿔
//      원래 onchange(bieExpPick)를 그대로 부름 — 월별 입력 · 저장 동작은 원래 그대로. 고른 뒤엔 한 줄로 접히고 [바꾸기]로 다시 열기
// ════════════════════════════════════════════════════════════════════════════════

var ACT_EXP = { line: '#8FA347', soft: '#F7F9F1', mid: '#E3EAD2', ink: '#495701' };   // 경비 계정 색 Olive 300 · 20 · 50 · 700
var actPickOpen = {};                                                                  // 입력 행별 [바꾸기]로 펼친 상태

function actEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

// 「의욕관리비 (705501) · 통제」 → { name, code, ctrl }
function actOptParse(t) {
  var m = String(t || '').match(/^(.*?)\s*\(([^)]+)\)\s*(?:·\s*(.+))?$/);
  return m ? { name: m[1].trim(), code: m[2].trim(), ctrl: (m[3] || '').trim() } : { name: String(t || '').trim(), code: '', ctrl: '' };
}

function actExpPicker() {
  document.querySelectorAll('#s-budget .bie-exp label.agexe-pick').forEach(function (lab) {
    var sel = lab.querySelector('select');
    if (!sel || sel.disabled) return;
    var tr = lab.closest('tr[data-bie-key]');
    var key = tr ? tr.getAttribute('data-bie-key') : '';
    var sig = sel.value + '|' + (actPickOpen[key] ? 1 : 0) + '|' + sel.options.length;
    var box = lab.nextElementSibling && lab.nextElementSibling.classList.contains('act-pick') ? lab.nextElementSibling : null;
    if (box && box.getAttribute('data-sig') === sig) return;
    lab.classList.add('act-src');
    if (!box) { box = document.createElement('div'); box.className = 'act-pick'; lab.parentNode.insertBefore(box, lab.nextSibling); }
    box.setAttribute('data-sig', sig);
    var cur = sel.value ? sel.options[sel.selectedIndex] : null;
    if (cur && !actPickOpen[key]) {
      var g = cur.parentNode && cur.parentNode.tagName === 'OPTGROUP' ? cur.parentNode.label : '';
      var o = actOptParse(cur.textContent);
      box.innerHTML = '<div class="act-chosen"><span class="act-lab">세부계정</span>'
        + '<span class="act-chip on">' + (g ? '<em>' + actEsc(g) + ' ›</em>' : '') + '<b>' + actEsc(o.name) + '</b><small>' + actEsc(o.code) + '</small>' + (o.ctrl ? '<i>' + actEsc(o.ctrl) + '</i>' : '') + '</span>'
        + '<button type="button" class="act-change" onclick="actPickToggle(\'' + key + '\',true)">바꾸기</button></div>';
      return;
    }
    var groups = Array.prototype.slice.call(sel.querySelectorAll('optgroup')).map(function (og) {
      var chips = Array.prototype.slice.call(og.querySelectorAll('option')).map(function (op) {
        var o = actOptParse(op.textContent);
        return '<button type="button" class="act-chip' + (op.value === sel.value ? ' on' : '') + '" data-q="' + actEsc((og.label + ' ' + op.textContent).toLowerCase()) + '"'
          + ' onclick="actPickSet(this,\'' + key + '\',\'' + actEsc(op.value) + '\')"><b>' + actEsc(o.name) + '</b><small>' + actEsc(o.code) + '</small>' + (o.ctrl ? '<i>' + actEsc(o.ctrl) + '</i>' : '') + '</button>';
      }).join('');
      return '<div class="act-grp"><div class="act-gh">' + actEsc(og.label) + '</div>' + chips + '</div>';
    }).join('');
    box.innerHTML = '<div class="act-head"><span class="act-lab">세부계정 고르기</span>'
      + '<input type="search" class="act-find" placeholder="이름 · 계정코드로 찾기" oninput="actPickFind(this)">'
      + (cur ? '<button type="button" class="act-change" onclick="actPickToggle(\'' + key + '\',false)">닫기</button>' : '') + '</div>'
      + '<div class="act-grps">' + groups + '</div><div class="act-none" hidden>찾는 세부계정이 없습니다.</div>';
  });
}
function actPickSet(btn, key, v) {               // crud N — 경비 편성 세부계정 고르기(원래 드롭다운 값을 바꿔 원래 동작 실행)
  var box = btn.closest('.act-pick');
  var lab = box && box.previousElementSibling;
  var sel = lab && lab.querySelector('select');
  if (!sel) return;
  actPickOpen[key] = false;
  sel.value = v;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  actExpPicker();
}
function actPickToggle(key, open) {             // crud N — 고른 세부계정 [바꾸기] / [닫기]
  actPickOpen[key] = !!open;
  actExpPicker();
}
function actPickFind(inp) {                     // crud R — 세부계정 찾기(이름 · 계정코드)
  var q = inp.value.trim().toLowerCase();
  var box = inp.closest('.act-pick');
  var n = 0;
  box.querySelectorAll('.act-grp').forEach(function (g) {
    var any = false;
    g.querySelectorAll('.act-chip').forEach(function (c) {
      var hit = !q || c.getAttribute('data-q').indexOf(q) >= 0;
      c.hidden = !hit; if (hit) { any = true; n++; }
    });
    g.hidden = !any;
  });
  var none = box.querySelector('.act-none');
  if (none) none.hidden = n > 0;
}

(function actWatch() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var q = false;
  var mo = new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; try { actExpPicker(); } catch (e) { /* 무시 */ } }); });
  var start = function () { mo.observe(document.body, { childList: true, subtree: true }); actExpPicker(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

(function actStyle() {
  if (typeof document === 'undefined' || document.getElementById('act-style')) return;
  var G = '#s-budget .agent-ga';
  var st = document.createElement('style');
  st.id = 'act-style';
  st.textContent = [
    // ① 표 줄 사이 노란 선 → 연회색
    G + ' table td, ' + G + ' table th{border-bottom-color:#edf0f3 !important}',
    // ② 표 안 진행 막대 → 보고 있는 계정 색(넘침 빨강은 그대로)
    G + ' .agga-col.detail .agos-bar u:not(.bad){background:var(--acc,#94a3b8) !important}',
    //   경비 화면에 남은 예전 경비 초록(#12724f) → 경비 계정 색(Olive)
    G + ' .agexe-yh em{color:' + ACT_EXP.ink + ' !important}',
    G + ' .agex-btn.ghost{border-color:' + ACT_EXP.mid + ' !important;color:' + ACT_EXP.ink + ' !important}',
    G + ' .agex-alert.ok span b{color:' + ACT_EXP.ink + ' !important}',
    //   계정 꼬리표(알약 모양 — 기안 · 이력 등)도 새 계정 색으로: 바탕 50 · 글자 700 (예산 조정안 카드의 색 점 모양은 그대로)
    '#s-budget .agp-acct.a-blue{background:#E7E2FA;color:#554087}',
    '#s-budget .agp-acct.a-red{background:#F9DEE7;color:#7E3053}',
    '#s-budget .agp-acct.a-yellow{background:#F5E3D0;color:#704500}',
    '#s-budget .agp-acct.a-green{background:#E3EAD2;color:#495701}',
    '#s-budget .agp-acct.a-sky{background:#CFEDEF;color:#005C60}',
    // ③ 경비 도구줄 — 연도 탭 왼쪽, 버튼 오른쪽
    G + ' .agex-bar > .agex-years{margin-right:auto !important}',
    G + ' .agex-bar > .aglb-add{margin-left:0 !important}',
    // ④ 경비 세부계정 고르기
    '#s-budget .bie-exp label.agexe-pick.act-src{display:none !important}',
    '#s-budget .act-pick{margin:6px 0 10px}',
    '#s-budget .act-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}',
    '#s-budget .act-lab{font-size:13px;font-weight:800;color:#334155;white-space:nowrap}',
    '#s-budget .act-find{flex:0 1 280px;height:34px;border:1px solid #cbd5e1;border-radius:8px;padding:0 12px;font:inherit;font-size:13.5px;background:#fff}',
    '#s-budget .act-find:focus{outline:none;border-color:' + ACT_EXP.line + ';box-shadow:0 0 0 3px ' + ACT_EXP.mid + '}',
    '#s-budget .act-grps{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}',
    '#s-budget .act-grp{display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid #e3e7ec;border-radius:10px;background:#fff}',
    '#s-budget .act-grp[hidden], #s-budget .act-chip[hidden]{display:none !important}',
    '#s-budget .act-gh{font-size:12.5px;font-weight:800;color:#64748b;padding:0 2px 2px}',
    '#s-budget .act-chip{display:flex;align-items:center;gap:6px;width:100%;text-align:left;padding:8px 10px;border:1px solid #e1e5eb;border-radius:8px;background:#fff;font:inherit;cursor:pointer;color:#1c2432}',
    '#s-budget .act-chip:hover{border-color:' + ACT_EXP.line + ';background:' + ACT_EXP.soft + '}',
    '#s-budget .act-chip b{font-size:13.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#s-budget .act-chip small{font-size:12px;font-weight:600;color:#7c8390;font-variant-numeric:tabular-nums}',
    '#s-budget .act-chip i{margin-left:auto;font-style:normal;font-size:11px;font-weight:800;color:#5f6675;background:#f1f3f5;border-radius:4px;padding:1px 6px;white-space:nowrap}',
    '#s-budget .act-chip em{font-style:normal;font-size:12px;font-weight:700;color:#64748b}',
    '#s-budget .act-chip.on{border-color:' + ACT_EXP.line + ';background:' + ACT_EXP.soft + ';box-shadow:inset 0 0 0 1px ' + ACT_EXP.line + '}',
    '#s-budget .act-chosen{display:flex;align-items:center;gap:10px}',
    '#s-budget .act-chosen .act-chip{width:auto;cursor:default}',
    '#s-budget .act-change{height:30px;padding:0 12px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;font:inherit;font-size:13px;font-weight:800;color:#334155;cursor:pointer}',
    '#s-budget .act-change:hover{border-color:#94a3b8;background:#f8fafc}',
    '#s-budget .act-none{padding:16px;text-align:center;color:#94a3b8;font-size:13px}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();
