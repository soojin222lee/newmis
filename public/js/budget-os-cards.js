// ════════════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 > 외주비 — 업체 표 간결하게 + 구매계획을 분기 카드로                     작성: 남주
//  (디자인시안_14_외주비표 v6 · 회의: 정보량 줄이기 · 버튼이 너무 많아 헷갈림)
//
//  공유 렌더러(budget-agent-console.js:renderAgentOutsourceDetailFinal) · 표 안 편집(budget-inline-edit.js)은 고치지 않고,
//  그려진 표를 뒤에서 다듬습니다(budget-design-d.js 뒤에 로드, MutationObserver · 여러 번 불려도 같은 결과).
//
//  업체 표
//   · 숫자 칸: 전체기간 예산 · 구매계획 · 실적(검수) · 집행예정(미검수) — 계산값인 미계획(예산 − 계획)은 칸 대신 막대 말풍선
//   · 막대 하나 = 한 가지 뜻: "예산 중 구매계획을 잡은 비율" + 「예산의 N%」(넘으면 빨강). 색은 외주비 계정 색(Rose)
//   · 업체 칸: 업체명 + 업무명 · 업체 전체 기간 (건수는 펼친 머리에 있음)
//   · 버튼: 줄마다 체크박스 · [수정] · [+ 구매계획] → 줄 끝 [⋯] 하나(구매계획 추가 · 업체 수정 · 업체 삭제)
//   · 체크박스 · [선택삭제] 숨김 — 삭제는 [⋯] → 삭제 = 원래와 같은 "삭제 예정"(취소선 · ↺), [저장]을 눌러야 반영
//  구매계획(업체 펼친 안)
//   · 표 → 분기 카드(시간 순서대로 가로). 카드 = 분기 · 기간 · 금액 · 상태(검수 완료 / PO 발행 · 검수 중 / 계약 대기) · PO번호 · 실적
//   · 계약 대기 카드만 [⋯](수정 · 삭제), PO 발행 카드는 🔒(구매시스템 값). 마지막 칸 「＋ 구매계획 추가」
//   · 수정 · 추가는 원래 표 안 편집 그대로 — 입력 행(tr.bie-row)을 카드 모양으로만 보여 줌(입력칸 · [취소] · 위 [저장] 동작 동일)
// ════════════════════════════════════════════════════════════════════════════════

var OSC_C = { line: '#D2779C', soft: '#FEF5F8', mid: '#F3C6D6' };   // 외주비 계정 색 Rose 300 · 20 · 100

function oscNum(s) { return Number(String(s || '').replace(/[^0-9-]/g, '')) || 0; }
function oscHide(el) { if (el && el.style.getPropertyValue('display') !== 'none') el.style.setProperty('display', 'none', 'important'); }
function oscCall(s) { return String(s || '').replace(/^event\.stopPropagation\(\);?\s*/, ''); }
function oscEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

// [⋯] 메뉴 항목 — ddMoreOpen(budget-design-d.js)이 data-dd-more 가 같은 숨은 버튼들을 메뉴로 보여 주고, 누르면 그 버튼을 대신 누름
function oscProxy(key, label, onclick, cls) {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'osc-proxy' + (cls ? ' ' + cls : '');
  b.textContent = label;
  b.setAttribute('onclick', 'event.stopPropagation();' + onclick);
  if (typeof ddHideEl === 'function') ddHideEl(b, key); else { b.setAttribute('data-dd-more', key); oscHide(b); }
  return b;
}
function oscDots(key, title) {
  return '<button type="button" class="dd-more osc-dots" title="' + oscEsc(title) + '" aria-label="' + oscEsc(title) + '"'
    + ' onclick="event.stopPropagation();ddMoreOpen(this,\'' + key + '\')">⋯</button>';
}

// 하나만 삭제 예정으로 — 원래 [선택삭제](bieDeleteChecked)와 같은 목록(BIE_DELS)에 넣음. [저장]을 눌러야 실제로 지움
function oscDelMark(call) {                    // crud D — 업체 · 구매계획 삭제 예정 표시
  if (!call || typeof BIE_DELS === 'undefined') return;
  if (!BIE_DELS.some(function (x) { return x.call === call; })) {
    BIE_DELS.push({ id: 'x' + (++bieDelSeq), call: call, isExp: false, ctx: (typeof bieCtx === 'function' ? bieCtx() : '') });
  }
  renderBudgetPage();
  if (typeof showToast === 'function') showToast('삭제 예정으로 표시했습니다. [저장]을 눌러야 반영됩니다.');
}

// 합계 줄처럼 앞 칸이 합쳐진(colspan) 줄에서 n번째 칸(머리 기준)을 찾아 숨김
function oscOffAt(r, n) {
  if (n < 0 || r.cells.length < 2) return;
  var pos = 0;
  Array.prototype.some.call(r.cells, function (td) { if (pos === n && td.colSpan === 1) { td.classList.add('osc-off'); return true; } pos += td.colSpan || 1; return pos > n; });
}
function oscApply() {
  var t = document.querySelector('#s-budget .agga-col.detail table.aglb.agos');
  if (!t || !t.tHead) return;
  var detail = t.closest('.agga-col.detail');
  t.classList.add('osc');
  // 체크박스 · [선택삭제] 숨김(삭제는 [⋯]로)
  detail.querySelectorAll('.bie-delsel').forEach(oscHide);

  var ths = Array.prototype.slice.call(t.tHead.rows[0].cells);
  var col = function (re) { return ths.findIndex(function (th) { return re.test(th.textContent.replace(/\s/g, '')); }); };
  var iBud = col(/^전체기간예산/), iPlan = col(/^구매계획/), iUn = col(/^미계획/), iMng = col(/^관리$/);
  if (iUn >= 0) ths[iUn].classList.add('osc-off');
  if (iMng >= 0 && ths[iMng].textContent) ths[iMng].textContent = '';
  if (iPlan >= 0 && ths[iPlan].textContent.trim() !== '구매계획 금액') ths[iPlan].textContent = '구매계획 금액';

  if (t.tFoot) Array.prototype.slice.call(t.tFoot.rows).forEach(function (r) { oscOffAt(r, iUn); });
  Array.prototype.slice.call(t.tBodies[0] ? t.tBodies[0].rows : []).forEach(function (r) {
    if (r.classList.contains('agos-sub')) { oscPanel(r); return; }
    if (r.cells.length !== ths.length) { oscOffAt(r, iUn); return; }
    if (iUn >= 0) r.cells[iUn].classList.add('osc-off');
    if (!r.classList.contains('agos-row') || r.classList.contains('bie-row')) return;   // 업체 입력 행은 원래 모양(그 자리에서 고치기)
    if (r.getAttribute('data-osc')) return;
    r.setAttribute('data-osc', '1');
    var vid = ((r.getAttribute('onclick') || '').match(/'([^']+)'/) || [])[1] || '';
    var c = r.cells;
    // 업체 칸: 업무명 · 업체 전체 기간
    var sub = r.querySelector('.aglb-sub');
    if (sub) {
      var parts = sub.textContent.replace(/\s+/g, ' ').trim().split(' · ');
      sub.title = parts.join(' · ');
      sub.textContent = parts.length > 2 ? parts[0] + ' · ' + parts[parts.length - 1] : parts.join(' · ');
    }
    // 막대 하나 = 예산 중 구매계획 비율
    var budget = iBud >= 0 ? oscNum(c[iBud].textContent) : 0;
    var planCell = iPlan >= 0 ? c[iPlan] : null;
    if (planCell) {
      var b = planCell.querySelector('b');
      var plan = oscNum(b ? b.textContent : planCell.textContent);
      var pct = budget ? Math.round(plan / budget * 100) : 0, over = plan - budget >= 1;
      var left = budget - plan;
      var old = planCell.querySelector('.agos-bar'); if (old) old.remove();
      planCell.insertAdjacentHTML('beforeend', '<span class="osc-bar' + (over ? ' over' : '') + '" title="'
        + (over ? '예산 초과 ' + (plan - budget).toLocaleString() + '원' : '전체기간 예산 중 구매계획을 잡은 비율 · 남은 예산(미계획) ' + left.toLocaleString() + '원') + '">'
        + '<i><u style="width:' + Math.min(100, pct) + '%"></u></i>예산의 ' + pct + '%</span>');
    }
    // 버튼 → 줄 끝 [⋯]
    var mng = iMng >= 0 ? c[iMng] : c[c.length - 1];
    var add = r.querySelector('.agos-add'), ed = r.querySelector('.agos-eds .agos-ed');
    var ck = r.querySelector('input.bie-ck');
    var key = 'osv-' + vid;
    if (r.classList.contains('bie-del')) {
      var undoId = r.getAttribute('data-del-id');
      mng.innerHTML = '<span class="osc-delmark">삭제 예정</span><button type="button" class="osc-undo" title="삭제 취소" onclick="event.stopPropagation();bieUndoDel(\'' + undoId + '\')">↺</button>';
      return;
    }
    if (!add && !ed && !ck) return;                       // 조회 전용(직책자 등)
    var box = document.createElement('span');
    box.className = 'osc-proxies';
    if (add) box.appendChild(oscProxy(key, '＋ 구매계획 추가', oscCall(add.getAttribute('onclick'))));
    if (ed) box.appendChild(oscProxy(key, '업체 수정', oscCall(ed.getAttribute('onclick'))));
    if (ck) {
      var vd = oscProxy(key, '업체 삭제', 'oscDelMark(this.getAttribute(\'data-call\'))', 'del');
      vd.setAttribute('data-call', ck.getAttribute('data-del'));
      box.appendChild(vd);
    }
    mng.innerHTML = oscDots(key, '구매계획 추가 · 업체 수정 · 업체 삭제');
    mng.appendChild(box);
  });
}

// 업체 펼친 안 — 머리 문구 정리 + 구매계획 표 → 분기 카드
function oscPanel(sub) {
  var panel = sub.querySelector('.agos-panel');
  if (!panel) return;
  var row = sub.previousElementSibling;
  while (row && !row.classList.contains('agos-row')) row = row.previousElementSibling;
  var vid = row ? (((row.getAttribute('onclick') || '').match(/'([^']+)'/) || [])[1] || '') : '';
  var canAdd = row && (row.querySelector('.agos-add') || row.querySelector('.osc-proxy'));
  var hs = panel.querySelector('.agos-panel-head > span');
  if (hs && /·/.test(hs.textContent)) hs.textContent = hs.textContent.split('·')[0].trim();
  var L = panel.querySelector('table.agos-lines');
  if (!L) {
    if (canAdd && !panel.querySelector('.osc-add-solo')) {
      panel.insertAdjacentHTML('beforeend', '<div class="osc-cards-solo"><button type="button" class="osc-add osc-add-solo" onclick="agentOsPoOpenFinal(\'' + vid + '\',-1)">＋ 구매계획 추가</button></div>');
    }
    return;
  }
  L.classList.add('osc-cards');
  var heads = L.tHead ? Array.prototype.slice.call(L.tHead.rows[0].cells).map(function (th) { return th.textContent.replace(/\s+/g, ' ').trim(); }) : [];
  var at = function (re) { return heads.findIndex(function (h) { return re.test(h.replace(/\s/g, '')); }); };
  var iQ = at(/^분기/), iPer = at(/^계획기간/), iAmt = at(/^계획금액/), iPo = at(/^PO번호/), iAct = at(/^실적/), iTodo = at(/^집행예정/), iSt = at(/^상태/), iAct2 = at(/^관리/);
  var tb = L.tBodies[0];
  if (!tb) return;
  Array.prototype.slice.call(tb.rows).forEach(function (r, idx) {
    if (r.getAttribute('data-osc') || r.classList.contains('osc-addrow')) return;
    // 입력 행(수정 · 추가 중) — 칸은 그대로 두고 카드 모양 + 칸 이름만 붙임(입력값 · 저장은 원래 표 안 편집 그대로)
    if (r.classList.contains('bie-row')) {
      r.setAttribute('data-osc', '1');
      r.classList.add('osc-edit');
      Array.prototype.slice.call(r.cells).forEach(function (td, i) {
        if (heads[i] && !td.classList.contains('bie-ckc') && !/^관리$/.test(heads[i])) td.setAttribute('data-label', heads[i].replace(/\s*·\s*월$/, ''));
        if ((!td.querySelector('input, select, textarea, button') && !td.textContent.trim()) || /^(PO번호|실적|집행예정|상태)/.test((heads[i] || '').replace(/s/g, ''))) td.classList.add('osc-off');
      });
      if (!r.querySelector('.osc-edit-tag')) {
        var isNew = !r.querySelector('td:not(.bie-ckc) b');
        r.insertAdjacentHTML('afterbegin', '<td class="osc-edit-tag"><b>' + (isNew ? '새 구매계획' : '구매계획 수정') + '</b><em>' + (isNew ? '추가 중' : '수정 중') + '</em></td>');
      }
      return;
    }
    if (r.cells.length === 1) return;                       // 빈 목록 안내
    var c = r.cells;
    var txt = function (i) { return i >= 0 && c[i] ? c[i].textContent.replace(/\s+/g, ' ').trim() : ''; };
    var q = txt(iQ), per = txt(iPer), amt = txt(iAmt);
    var poCell = iPo >= 0 ? c[iPo] : null;
    var poNo = poCell ? ((poCell.childNodes[0] && poCell.childNodes[0].nodeType === 3 ? poCell.childNodes[0].nodeValue : poCell.textContent).match(/[0-9A-Za-z-]{5,}/) || [''])[0] : '';
    var fx = poCell && poCell.querySelector('.agos-fx') ? poCell.querySelector('.agos-fx').textContent.trim() : '';
    var act = txt(iAct), todo = txt(iTodo), st = txt(iSt);
    var hasPo = !!poNo && /PO/.test(st);
    var done = hasPo && oscNum(todo) === 0;
    var badge = hasPo ? (done ? '<span class="osc-st done">검수 완료</span>' : '<span class="osc-st ing">PO 발행 · 검수 중</span>')
      : '<span class="osc-st wait">' + oscEsc(st || '계약 대기') + '</span>';
    var info = hasPo
      ? '<div class="osc-info">PO ' + oscEsc(poNo) + (fx ? ' · ' + oscEsc(fx) : '') + '<br>실적 <b>' + oscEsc(act) + '</b>' + (done ? '' : ' · 남은 검수 <b>' + oscEsc(todo) + '</b>') + '</div>'
      : '<div class="osc-info">PO 발행 전 — 고칠 수 있음</div>';
    var key = 'osl-' + vid + '-' + idx;
    var mngCell = iAct2 >= 0 ? c[iAct2] : null;
    var edBtn = mngCell ? Array.prototype.find.call(mngCell.querySelectorAll('button'), function (b) { return /수정/.test(b.textContent); }) : null;
    var ck = r.querySelector('input.bie-ck');
    var del = r.classList.contains('bie-del');
    var corner = '';
    var proxies = document.createElement('span');
    proxies.className = 'osc-proxies';
    if (del) {
      corner = '';
    } else if (edBtn || ck) {
      if (edBtn) proxies.appendChild(oscProxy(key, '수정', oscCall(edBtn.getAttribute('onclick'))));
      if (ck) { var dp = oscProxy(key, '삭제', 'oscDelMark(this.getAttribute(\'data-call\'))', 'del'); dp.setAttribute('data-call', ck.getAttribute('data-del')); proxies.appendChild(dp); }
      corner = oscDots(key, '수정 · 삭제');
    } else if (hasPo) {
      corner = '<span class="osc-lock" title="PO 발행 — 구매시스템 값이라 고칠 수 없음">🔒</span>';
    }
    var undo = del ? '<div class="osc-delbar">삭제 예정<button type="button" onclick="event.stopPropagation();bieUndoDel(\'' + r.getAttribute('data-del-id') + '\')">↺ 되돌리기</button></div>' : '';
    r.setAttribute('data-osc', '1');
    r.className = 'osc-card' + (hasPo ? '' : ' wait') + (del ? ' del' : '');
    r.innerHTML = '<td class="osc-card-td"><div class="osc-corner">' + corner + '</div>'
      + '<div class="osc-q">' + oscEsc(q) + '</div><div class="osc-per">' + oscEsc(per) + '</div>'
      + '<div class="osc-amt">' + oscEsc(amt) + '</div>' + badge + info + undo + '</td>';
    r.cells[0].appendChild(proxies);
  });
  if (canAdd && !tb.querySelector('tr.osc-addrow')) {
    tb.insertAdjacentHTML('beforeend', '<tr class="osc-addrow"><td><button type="button" class="osc-add" onclick="agentOsPoOpenFinal(\'' + vid + '\',-1)">＋ 구매계획 추가</button></td></tr>');
  }
}

(function oscWatch() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  var q = false;
  var mo = new MutationObserver(function () { if (q) return; q = true; requestAnimationFrame(function () { q = false; try { oscApply(); } catch (e) { /* 무시 */ } }); });
  var start = function () { mo.observe(document.body, { childList: true, subtree: true }); oscApply(); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

(function oscStyle() {
  if (typeof document === 'undefined' || document.getElementById('osc-style')) return;
  var T = '#s-budget table.aglb.agos.osc';
  var L = '#s-budget table.agos-lines.osc-cards';
  var st = document.createElement('style');
  st.id = 'osc-style';
  st.textContent = [
    // 업체 표
    T + ' .osc-off, ' + T + ' .bie-ckc{display:none !important}',
    T + ' > tbody > tr.agos-row:hover > td{background:#fafbfc !important}',
    T + ' > tbody > tr.agos-row.open > td{background:' + OSC_C.soft + ' !important}',
    T + ' > tbody > tr > td{border-bottom-color:#edf0f3 !important}',
    T + ' .agos-eds{display:none !important}',
    T + ' .aglb-sub{display:block !important;margin:3px 0 0 18px !important;font-size:13px !important;color:#5f6675 !important;white-space:normal !important}',
    T + ' .agos-plan b{font-size:15px}',
    T + ' .osc-bar{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:6px;font-size:12.5px;font-weight:700;color:#5f6675;white-space:nowrap}',
    T + ' .osc-bar i{display:block;width:110px;height:6px;border-radius:99px;background:#eceff3;overflow:hidden}',
    T + ' .osc-bar u{display:block;height:100%;border-radius:99px;background:' + OSC_C.line + ';text-decoration:none}',
    T + ' .osc-bar.over{color:#d1242f}',
    T + ' .osc-bar.over u{background:#d1242f}',
    T + ' .osc-dots{width:32px !important;min-width:32px !important;height:30px !important;padding:0 !important;border:1px solid transparent !important;background:transparent !important;font-size:16px !important;color:#64748b !important}',
    T + ' .osc-dots:hover{background:#f1f5f9 !important;border-color:#d3d9e2 !important;color:#1c2432 !important}',
    T + ' .osc-delmark{font-size:12px;font-weight:800;color:#b4233a;margin-right:4px}',
    T + ' .osc-undo{border:1px solid #f1b8c2;background:#fff;color:#b4233a;border-radius:6px;font:inherit;font-size:12px;font-weight:800;padding:2px 7px;cursor:pointer}',
    '#s-budget .agos-panel{border-left-color:' + OSC_C.line + ' !important}',
    '#s-budget .agos-panel-head > span{font-size:13px !important;color:#5f6675 !important}',
    // 구매계획 → 분기 카드
    L + '{display:block !important;border:0 !important;background:transparent !important;border-radius:0 !important;overflow:visible !important;table-layout:auto !important}',
    L + ' colgroup, ' + L + ' thead{display:none !important}',
    L + ' > tbody{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}',
    L + ' > tbody > tr{display:flex;flex-direction:column;gap:4px;position:relative;border:1px solid #e1e5eb;border-radius:10px;background:#fff;padding:12px 14px;min-height:118px}',
    L + ' > tbody > tr > td{display:block !important;border:0 !important;padding:0 !important;background:transparent !important;white-space:normal !important;overflow:visible !important;text-overflow:clip !important;text-align:left !important}',
    L + ' > tbody > tr:hover > td{background:transparent !important}',
    L + ' tr.osc-card.wait{border-style:dashed;background:#fffdfd}',
    L + ' tr.osc-card.del{opacity:.6;border-style:dashed;background:#fbfbfc}',
    L + ' tr.osc-card.del .osc-q, ' + L + ' tr.osc-card.del .osc-per, ' + L + ' tr.osc-card.del .osc-amt{text-decoration:line-through}',
    L + ' .osc-card-td{display:flex !important;flex-direction:column;gap:4px}',
    L + ' .osc-corner{position:absolute;right:8px;top:8px}',
    L + ' .osc-corner .osc-dots{width:30px;height:28px;border:1px solid transparent;border-radius:7px;background:transparent;font-size:16px;font-weight:900;color:#64748b;cursor:pointer;padding:0}',
    L + ' .osc-corner .osc-dots:hover{background:#f1f5f9;border-color:#d3d9e2;color:#1c2432}',
    L + ' .osc-lock{font-size:13px;opacity:.55}',
    L + ' .osc-q{font-size:15px;font-weight:800;color:#1c2432}',
    L + ' .osc-per{font-size:12.5px;font-weight:600;color:#6d7482}',
    L + ' .osc-amt{font-size:17px;font-weight:800;color:#1c2432;margin-top:4px;font-variant-numeric:tabular-nums}',
    L + ' .osc-st{align-self:flex-start;font-size:12px;font-weight:800;border-radius:5px;padding:2px 8px;margin-top:4px}',
    L + ' .osc-st.done{background:#e7f6ef;color:#0f7a4f}',
    L + ' .osc-st.ing{background:#eaf1ff;color:#2449c7}',
    L + ' .osc-st.wait{background:#f1f3f5;color:#475569}',
    L + ' .osc-info{font-size:12.5px;font-weight:600;color:#5f6675;line-height:1.55}',
    L + ' .osc-info b{color:#1c2432}',
    L + ' .osc-delbar{display:flex;align-items:center;justify-content:space-between;margin-top:6px;padding:6px 8px;border-radius:7px;background:#fdecef;color:#b4233a;font-size:12.5px;font-weight:800}',
    L + ' .osc-delbar button{border:1px solid #f1b8c2;background:#fff;color:#b4233a;border-radius:6px;font:inherit;font-size:12px;font-weight:800;padding:2px 8px;cursor:pointer}',
    //   입력 카드(수정 · 추가 중) — 원래 입력칸을 칸 이름과 함께 세로로
    L + ' tr.osc-edit{border:2px solid #2f5bea;box-shadow:0 4px 14px rgba(47,91,234,.12);gap:8px}',
    L + ' tr.osc-edit td.bie-ckc, ' + L + ' tr.osc-edit td.osc-off{display:none !important}',
    L + ' tr.osc-edit td[data-label]::before{content:attr(data-label);display:block;font-size:12px;font-weight:800;color:#5f6675;margin-bottom:4px}',
    L + ' tr.osc-edit input, ' + L + ' tr.osc-edit select{max-width:100%}',
    L + ' .osc-edit-tag{display:flex !important;align-items:center;justify-content:space-between}',
    L + ' .osc-edit-tag b{font-size:15px;color:#1c2432}',
    L + ' .osc-edit-tag em{font-style:normal;font-size:11.5px;font-weight:800;color:#2f5bea;background:#eaf1ff;border-radius:5px;padding:1px 7px}',
    //   ＋ 구매계획 추가 카드
    L + ' tr.osc-addrow{padding:0;border:0;background:transparent}',
    '#s-budget .osc-add{width:100%;height:100%;min-height:118px;border:1.5px dashed #c7d0dc;border-radius:10px;background:#fafbfc;font:inherit;font-size:14px;font-weight:800;color:#2f5bea;cursor:pointer}',
    '#s-budget .osc-add:hover{border-color:#2f5bea;background:#f5f8ff}',
    '#s-budget .osc-cards-solo{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));margin-top:8px}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);
})();
