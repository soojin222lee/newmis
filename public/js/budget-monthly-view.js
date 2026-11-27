// ════════════════════════════════════════
//  수행원가 > 원가조정 — [월별 계획/실적 보기] 팝업 보기 좋게       작성: 남주
// ════════════════════════════════════════
//
// AI GUIDE: 원가조정 Agent 화면 계정 상세의 [월별 계획/실적 보기] 팝업(renderAgentAcctMonthlyPopFinal)을 다시 그리는 전용 파일입니다.
// - 문제: 기존 표는 프로젝트 기간의 모든 달(2026-01, 2026-02 …)을 한 줄로 늘어놔 옆으로 너무 길었습니다.
// - 바꾸는 것(공유 렌더러 renderAccountMonthlyBudgetTable 은 고치지 않고, 같은 데이터 getMonthlyBudgetRows 로 새로 그림)
//   · 보기  : [월별] [분기별] [연도별] 로 묶어서 보기
//             [기간](2026.11.17) — 시작 월 ~ 끝 월(input type=month, 일은 고르지 않음)을 골라 그 달만 월별로 + 맨 앞 '기간 합계'.
//             처음엔 올해(프로젝트 기간 안), 거꾸로 고르면 바꿔 줌. 기간 보기에선 연도 선택 · 실적 접기 대신 기간 칸
//   · 연도  : 전체 / 연도 하나만 골라 보기
//   · 단위  : 원 / 만원(기본) / 억원 — 숫자 폭을 줄임 (억원은 소수 둘째 자리)
//   · 실적  : 지난 달(확정 실적)은 기본으로 "실적 합계" 한 칸으로 접고, [펼치기]로 월별 표시
//   · 월별 보기에서는 연도 머리줄 + "11월"처럼 짧게, 연도마다 "연도 합계" 칸
//   · 구분 · 계획 요약 열은 가로 스크롤해도 왼쪽에 고정
//   · 지난 달 금액을 누르면 기존과 같은 실적 상세(actualCellHtml → showActualDetailModal)
// - 공유 파일은 고치지 않고, 이 파일이 뒤에 로드되어 renderAgentAcctMonthlyPopFinal 을 덮어씁니다.

var bmvMode = 'month';      // month | quarter | year | range
var bmvYear = 'all';        // all | '2026' …
// [2026.11.17] 기간 보기 — 시작 월 ~ 끝 월(YYYY-MM, 일은 고르지 않음). 처음 [기간]을 누르면 올해(프로젝트 기간 안)로 채움
var bmvFrom = '';
var bmvTo = '';
var BMV_UNITS = [[1, '원', 0], [10000, '만원', 0], [100000000, '억원', 2]];   // [나눌 값, 이름, 소수 자리]
var bmvUnit = 10000;        // 1 | 10000 | 100000000
function bmvUnitInfo() { return BMV_UNITS.find(function (u) { return u[0] === bmvUnit; }) || BMV_UNITS[0]; }
var bmvActOpen = false;     // 지난 달(실적) 월별로 펼치기

function bmvSet(k, v) {
  if (k === 'mode') bmvMode = v;
  if (k === 'year') bmvYear = v;
  if (k === 'unit') bmvUnit = Number(v) || 1;
  if (k === 'act') bmvActOpen = !bmvActOpen;
  if (k === 'from' && /^\d{4}-\d{2}$/.test(v)) bmvFrom = v;
  if (k === 'to' && /^\d{4}-\d{2}$/.test(v)) bmvTo = v;
  bmvRerender();
}
// [2026.11.17] 마감 전 당월(close-month.js CUR_YM) — 칸 제목 아래 "진행 중"
function bmvCurSub(m) { return (typeof CUR_YM !== 'undefined' && m === CUR_YM) ? '진행 중' : ''; }
function bmvIsPast(m) {
  return (typeof isPastActualMonth === 'function') ? !!isPastActualMonth(m) : false;
}
function bmvNum(v) {
  const n = Number(v) || 0;
  const d = Math.pow(10, bmvUnitInfo()[2]);
  const x = Math.round(n / bmvUnit * d) / d;
  return fmt(x);
}

// [2026.11.19] 실적 상세를 팝업 위 팝업 대신 같은 팝업 안에서 — 지난 달 금액을 누르면 표 자리에 실적 상세가 들어오고
//   [← 월별 표로]로 돌아감(보기 · 연도 · 단위 · 실적 펼침 · 가로 스크롤 위치는 그대로).
//   원가 현황 등 다른 화면의 실적 상세(showActualDetailModal 팝업)는 그대로입니다 — 이 팝업 안 링크만 바꿈.
var bmvDrill = null;        // null | { acct, m, name } — 팝업 안에서 보고 있는 실적 상세
var bmvDrillScroll = 0;     // 들어가기 전 월별 표 가로 스크롤 위치
var bmvDrillPopH = 0;       // [2026.11.27] 들어가기 전 월별 팝업 높이 — 실적 상세에서도 같은 크기(모든 계정)
var bmvView = null;         // 지금 그린 월별 데이터(viewData) — 실적 상세 위 「해당 줄」에 씀
function bmvDrillOpen(acct, m, name) {      // crud R — 월별 팝업 안에서 그 달 실적 상세 조회
  if (!bmvDrill) {
    const sc = document.querySelector('.bmv-pop .bmv-scroll');
    bmvDrillScroll = sc ? sc.scrollLeft : 0;
    const pop = document.querySelector('.bmv-pop');
    bmvDrillPopH = pop ? Math.round(pop.getBoundingClientRect().height) : 0;
  }
  bmvDrill = { acct: acct, m: m, name: name };
  bmvRerender();
}
// [2026.11.27] 실적 상세 안에서 다른 달 · 다른 세부 항목으로 옮기기(위 「해당 줄」의 달 금액 · 탭) — 돌아갈 표 위치 · 팝업 크기는 처음 값 그대로
function bmvDrillGo(m, name) {              // crud R — 실적 상세에서 다른 달 · 세부 항목 조회
  if (bmvAp) { bmvApGo(m, name); return; }
  if (!bmvDrill) return;
  // 달 · 탭을 바꿀 때 팝업이 줄었다 늘었다 하지 않게 — 지금까지 가장 컸던 높이를 최소 높이로
  const pop = document.querySelector('.bmv-pop');
  if (pop) bmvDrillPopH = Math.max(bmvDrillPopH, Math.round(pop.getBoundingClientRect().height));
  bmvDrill = { acct: bmvDrill.acct, m: m || bmvDrill.m, name: name || bmvDrill.name };
  bmvRerender();
}
// [2026.11.27] 실적 상세 위 「해당 줄」 — 실적발생월 · 조회기간 검색 대신, 월별 표에서 누른 그 줄(예: 실투입대상 외주비)의 지난 달 실적을
//   한 줄로 보여 주고 다른 달 금액을 누르면 그 달 실적 상세로 바로 옮김(1월을 보다가 2월로). 지금 보는 달은 굵게 · 파란 밑줄
function bmvSrc() { return (bmvAp ? (bmvApView || bmvView) : (bmvView || bmvApView)) || null; }
function bmvSrcRows(acct) {
  const v = bmvSrc();
  if (typeof getMonthlyBudgetRows !== 'function' || !v) return [];
  bmvCapOff = true;
  try { return getMonthlyBudgetRows(v, acct) || []; } catch (e) { return []; } finally { bmvCapOff = false; }
}
// 원가현황 등 다른 화면의 줄 이름(예: 실투입외주비 · 공사/MA외주비)을 월별 표의 세부 항목 이름(실투입대상 외주비 · 공사MA)에 맞춤
function bmvMatchName(acct, name) {
  if (name === acct) return name;                // 계정 합계 줄
  const rows = bmvSrcRows(acct).map(function (x) { return x.name; });
  if (rows.indexOf(name) >= 0) return name;
  const n = function (v) { return String(v || '').replace(/[\s/]/g, ''); };
  const k = n(name);
  const hit = rows.find(function (x) { const y = n(x); return y && k && (y.indexOf(k) >= 0 || k.indexOf(y) >= 0); })
    || rows.find(function (x) { const y = n(x); return y.length >= 3 && k.length >= 3 && y.slice(0, 3) === k.slice(0, 3); });
  return hit || name;
}
function bmvStripRow(acct, name) {
  const rows = bmvSrcRows(acct);
  let r = name === acct ? null : rows.find(function (x) { return x.name === name; });
  // 인건비는 탭 이름(사내인건비/사내간접비 · 종업원급여-OT · 이관인건비)과 줄 이름(실투입인건비 · OT비 · 이관인건비)이 달라 같은 묶음으로 찾음
  if (!r && name !== acct && typeof blfActTabIdx === 'function' && typeof CATS !== 'undefined' && acct === CATS[0]) {
    const k = blfActTabIdx(name);
    r = rows.find(function (x) { return blfActTabIdx(x.name) === k; });
  }
  // 계정 줄(예: 원가현황 '외주비' 합계)을 눌렀으면 그 계정 전체 줄
  if (!r && rows.length) {
    const sum = [];
    rows.forEach(function (x) { (x.months || []).forEach(function (v, i) { sum[i] = (sum[i] || 0) + (Number(v) || 0); }); });
    r = { name: acct + ' 전체', months: sum };
  }
  return r || null;
}
function bmvStripHtml(d) {
  const r = bmvStripRow(d.acct, d.row || d.name);   // row: 원가현황에서 계정 합계 줄을 눌렀으면 그 계정 전체 줄
  const src = bmvSrc();
  const months = ((src && src.months) || []).map(function (x) { return x.m; });
  if (!r || !months.length) return '';
  const past = [];
  months.forEach(function (m, i) { if (bmvIsPast(m)) past.push({ m: m, v: Number((r.months || [])[i]) || 0 }); });
  if (!past.length) return '';
  const sum = past.reduce(function (t, x) { return t + x.v; }, 0);
  const nm = escHtml(String(d.name || '').replace(/'/g, "\\'"));
  // [2026.11.27 v2] 달마다 누를 수 있는 칸(위 달 · 아래 금액). 지금 보는 달은 파란 칸, 실적이 없는 달은 회색으로 못 누름
  const y0 = past[0].m.slice(0, 4);
  const lab = function (x, i) {
    const y = x.m.slice(0, 4), mo = Number(x.m.slice(5, 7));
    return (y !== y0 && (mo === 1 || i === 0) ? y.slice(2) + '년 ' : '') + mo + '월';
  };
  const unit = bmvUnitInfo()[1];
  // 칸 폭 = 가장 긴 금액이 들어가는 폭(단위 '원'이면 금액이 길어짐). 칸이 다 안 들어가면 이 줄만 옆으로 넘김
  const maxLen = past.reduce(function (t, x) { return Math.max(t, (x.v ? bmvNum(x.v) : '–').length); }, 3);
  const long = maxLen >= 10;   // 단위 '원' 등으로 금액이 길면 칸 글자를 조금 줄여 한 줄에 다 들어가게
  const tw = long ? Math.ceil(maxLen * 7.8 + 20) : Math.max(78, Math.ceil(maxLen * 9 + 24));
  const tile = function (x, i) {
    const on = x.m === d.m;
    const inner = '<span class="bmv-mt-m">' + lab(x, i) + '</span><span class="bmv-mt-v">' + (x.v ? bmvNum(x.v) : '–') + '</span>';
    if (on) return '<span class="bmv-mt on" aria-current="true">' + inner + '</span>';
    if (!x.v) return '<span class="bmv-mt off" title="' + x.m + ' 실적 없음">' + inner + '</span>';
    return '<button type="button" class="bmv-mt" onclick="bmvDrillGo(\'' + x.m + '\',\'\')" title="' + x.m + ' 실적 상세 조회">' + inner + '</button>';
  };
  return `<div class="bmv-strip-box">
    <div class="bmv-strip-cap"><b>${escHtml(r.name)}</b><span>달을 누르면 그 달 실적으로 바뀝니다 · 단위 ${unit}</span>
      <em>실적 합계 <b>${bmvNum(sum)}</b></em></div>
    <div class="bmv-strip${long ? ' long' : ''}" style="--n:${past.length};--tw:${tw}px">${past.map(tile).join('')}</div></div>`;
}
// 실적 상세 위 탭 = 월별 표의 줄(세부 항목) 이름 — 월별 표에서 누른 줄과 탭이 같은 이름
function bmvDrillTabs(acct) {
  const rows = bmvSrcRows(acct);
  return rows.map(function (x) { return x.name; }).filter(function (n) { return n && n !== '합계'; });
}
function bmvDrillBack() {                   // crud N — 실적 상세 → 월별 표로 돌아가기
  bmvDrill = null;
  bmvDrillPopH = 0;
  bmvRerender();
  const x = bmvDrillScroll;
  requestAnimationFrame(function () { const sc = document.querySelector('.bmv-pop .bmv-scroll'); if (sc) sc.scrollLeft = x; });
}
// 실적 상세 내용 — 공유 실적조회(showActualDetailModal)를 그대로 그려 그 안쪽(조회 조건 · 탭 · 엑셀 · 표)만 가져옴
//   (공유 팝업은 열자마자 닫아 화면에 뜨지 않음. [엑셀]은 엑셀 파일(budget-excel-export.js)이 그 숨은 팝업 표로 내려받음)
function bmvDrillHtml(d) {
  if (typeof showActualDetailModal !== 'function') return '<p class="bmv-note">실적 상세를 불러올 수 없습니다.</p>';
  bmvInternal = true;
  try { showActualDetailModal(d.acct, d.m, d.name); } finally { bmvInternal = false; }
  const modal = document.getElementById('actual-detail-modal');
  if (!modal) return '';
  modal.classList.remove('open');
  const box = modal.querySelector('.actual-detail-modal');
  const parts = box ? Array.prototype.filter.call(box.children, function (el) {
    return !el.classList.contains('actual-detail-head') && !el.classList.contains('actual-detail-foot');
  }) : [];
  // [2026.11.24] 공유 팝업은 첫 탭을 늘 선택(active)으로 그려, 누른 세부 항목이 둘째 탭 이후면 두 개가 선택돼 보임 → 누른 항목 하나만 선택
  const tabs = box && box.querySelector('.actual-detail-tabs');
  if (tabs && d.name) {
    const btns = Array.prototype.slice.call(tabs.querySelectorAll('button'));
    if (btns.some(function (b) { return b.textContent.trim() === d.name; })) {
      btns.forEach(function (b) { b.classList.toggle('active', b.textContent.trim() === d.name); });
    }
  }
  // [2026.11.27] 모양을 인건비 실적 상세 · 외주비/재료비 실적조회 팝업과 같은 틀로 통일
  //   [해당 줄(지난 달 실적, 다른 달 누르면 이동)] → [탭(월별 표의 세부 항목) · 안내 · 엑셀 다운로드] → 표
  //   예전 실적발생월 · 조회기간 검색은 뺌(이 화면은 이미 달을 골라 들어옴 — 다른 달은 위 줄에서)
  if (!BMV_DRILL_OLD) {
    const wrap = box && box.querySelector('.actual-detail-table-wrap');
    const t = wrap && wrap.querySelector('table');
    if (t) {
      t.classList.add('bih-table');
      t.querySelectorAll('tr.total td').forEach(function (td) { td.classList.add('bmv-tot'); });
      // 경비 — 공유 목업(budget-status-4.js getActualDetailRows)이 마지막 칸(상호)을 금액으로 다뤄 합계가 0으로 나옴 → 이 화면에서만 실적반영금액 칸으로 바로잡음
      const ths = Array.prototype.map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
      const ai = ths.indexOf('실적반영금액');
      if (ai >= 0 && ai !== ths.length - 1) {
        let sum = 0;
        t.querySelectorAll('tbody tr:not(.total)').forEach(function (tr) {
          const c = tr.cells[ai], last = tr.cells[tr.cells.length - 1];
          if (last) last.classList.remove('num');
          if (c) { const v = Number(String(c.textContent).replace(/[^\d.-]/g, '')) || 0; sum += v; c.classList.add('num'); c.textContent = fmt(v); }
        });
        const tot = t.querySelector('tbody tr.total');
        if (tot) tot.innerHTML = '<td colspan="' + ai + '" class="bmv-tot">합계</td><td class="num bmv-tot">' + fmt(sum) + '</td>'
          + (ths.length - ai - 1 > 0 ? '<td colspan="' + (ths.length - ai - 1) + '" class="bmv-tot"></td>' : '');
      }
      // 금액 칸은 머리도 오른쪽 정렬(인건비 실적 상세와 같게)
      const r1 = t.querySelector('tbody tr:not(.total)');
      if (r1) Array.prototype.forEach.call(t.querySelectorAll('thead th'), function (th, i) { if (r1.cells[i] && r1.cells[i].classList.contains('num')) th.classList.add('num'); });
    }
    const names = bmvDrillTabs(d.acct);
    const seg = names.map(function (n) {
      const on = n === d.name;
      return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" onclick="bmvDrillGo(\'' + d.m + '\',\'' + escHtml(n.replace(/'/g, "\\'")) + '\')">' + escHtml(n) + '</button>';
    }).join('');
    return '<div class="bmv-drill2">' + bmvStripHtml(d)
      + '<div class="bih-bar">' + (seg ? '<div class="bih-seg" role="group" aria-label="세부 항목">' + seg + '</div>' : '')
      + '<span class="bih-hint">' + escHtml(d.m) + ' 확정 실적 전표입니다.</span>'
      + '<button type="button" class="bih-excel" onclick="bxeActual()">엑셀 다운로드</button></div>'
      + '<div class="bih-wrap">' + (t ? t.outerHTML : '<p class="bmv-note">실적이 없습니다.</p>') + '</div></div>';
  }
  // 선택 밑줄 = 계정색(원가조정 계정 상세 세부 탭과 같은 규칙)
  const acc = (typeof BFL_ACCT_COLOR !== 'undefined' && BFL_ACCT_COLOR[d.acct]) ? ' style="--acc:' + BFL_ACCT_COLOR[d.acct] + '"' : '';
  return '<div class="bmv-drill"' + acc + '>' + parts.map(function (el) { return el.outerHTML; }).join('') + '</div>';
}
var BMV_DRILL_OLD = false;

// ── [2026.11.27] 원가현황 등 월별 팝업 밖에서 실적 금액을 누를 때 — 같은 모양(해당 줄 → 탭 · 엑셀 → 표)의 따로 팝업 ──
//   예전엔 공유 실적조회 모달(실적발생월 · 조회기간 검색 + 밑줄 탭)이나 인건비 요약 3칸 팝업이 떴음 → 월별 팝업 안 실적 상세와 같게
var bmvAp = null;           // null | { acct, m, name } — 따로 팝업으로 보고 있는 실적 상세
var bmvApView = null;       // 마지막으로 그린 예산 데이터(월 목록 · 계정 값) — 해당 줄 · 탭에 씀
var bmvApH = 0;             // 달 · 탭을 바꿀 때 팝업이 줄었다 늘었다 하지 않게
var bmvInternal = false;    // 안에서 공유 실적조회를 그리는 중(감싸기 건너뜀)
var bmvCapOff = false;
function bmvApName(acct, name) {
  if (typeof CATS !== 'undefined' && acct === CATS[0] && typeof blfActTabIdx === 'function' && typeof BLF_ACT_TABS !== 'undefined') return BLF_ACT_TABS[blfActTabIdx(name)];
  return bmvMatchName(acct, name);
}
function bmvApOpen(acct, m, name) {         // crud R — 실적 상세(따로 팝업) 조회
  bmvApH = 0;
  bmvAp = { acct: acct, m: m, name: bmvApName(acct, name), row: name === acct ? acct : '' };
  bmvApPaint();
}
function bmvApGo(m, name) {                 // crud R — 따로 팝업에서 다른 달 · 세부 항목 조회
  if (!bmvAp) return;
  const pop = document.querySelector('#bmv-ap .bmv-pop');
  if (pop) bmvApH = Math.max(bmvApH, Math.round(pop.getBoundingClientRect().height));
  bmvAp = { acct: bmvAp.acct, m: m || bmvAp.m, name: name ? bmvApName(bmvAp.acct, name) : bmvAp.name, row: name ? '' : bmvAp.row };
  bmvApPaint();
}
function bmvApClose() {                     // crud N — 실적 상세(따로 팝업) 닫기
  bmvAp = null; bmvApH = 0;
  const el = document.getElementById('bmv-ap');
  if (el) el.remove();
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bmvAp) bmvApClose(); });
function bmvApPaint() {
  const d = bmvAp;
  if (!d) return;
  bmvInjectStyle();
  let body = '';
  const lab = typeof CATS !== 'undefined' && d.acct === CATS[0] && typeof blfActBodyHtml === 'function';
  try {
    body = lab ? blfActBodyHtml(d.m, blfActTabIdx(d.name), bmvStripHtml(d)) : bmvDrillHtml(d);
  } catch (e) { body = '<p class="bmv-note">실적 상세를 불러올 수 없습니다.</p>'; }
  const list = (typeof EXEC_BUDGET_PROJECTS !== 'undefined') ? EXEC_BUDGET_PROJECTS : [];
  const k = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  const pj = list.find(function (x) { return x.key === k; }) || {};
  let el = document.getElementById('bmv-ap');
  if (!el) { el = document.createElement('div'); el.id = 'bmv-ap'; document.body.appendChild(el); }
  el.innerHTML = `
    <div class="agv-pop-dim" onclick="if(event.target===this)bmvApClose()">
      <div class="agv-pop aglm-pop bmv-pop bmv-pop-drill"${bmvApH ? ' style="min-height:' + bmvApH + 'px"' : ''} role="dialog" aria-modal="true" aria-label="${escHtml(d.acct)} 실적 상세">
        <div class="agv-pop-head">
          <div>
            <div class="bmv-title"><strong>${escHtml(d.acct)} 실적 상세 <em class="bmv-crumb">› ${escHtml(d.m)}${d.name ? ' · ' + escHtml(d.name) : ''}</em></strong></div>
            <span>${pj.name ? escHtml(pj.name) + ' · ' : ''}그 달에 확정된 실적 내역입니다. 위 달을 누르면 다른 달 실적으로 바뀝니다.</span>
          </div>
          <button class="agv-pop-x" onclick="bmvApClose()" aria-label="닫기">✕</button>
        </div>
        <div class="agv-pop-body">${body}</div>
        <div class="agv-pop-foot"><button class="agv-cancel" onclick="bmvApClose()">닫기</button></div>
      </div>
    </div>`;
  requestAnimationFrame(function () {
    const st = el.querySelector('.bmv-strip'), on = st && st.querySelector('.bmv-mt.on');
    if (st && on && st.scrollWidth > st.clientWidth) {
      const a = on.getBoundingClientRect(), b = st.getBoundingClientRect();
      st.scrollLeft = Math.max(0, st.scrollLeft + (a.left - b.left) - (st.clientWidth - a.width) / 2);
    }
  });
}
// 모든 스크립트가 읽힌 뒤 감쌈(인건비 · 엑셀 파일의 감싸기보다 바깥) — 원가현황 등에서 부르는 공유 실적조회를 위 팝업으로
document.addEventListener('DOMContentLoaded', function () {
  if (typeof getMonthlyBudgetRows === 'function') {
    const g = getMonthlyBudgetRows;
    getMonthlyBudgetRows = function (data) { if (!bmvCapOff && data && data.months) bmvApView = data; return g.apply(this, arguments); };
  }
  const prev = window.showActualDetailModal;
  if (typeof prev !== 'function') return;
  window.showActualDetailModal = function (account, month, name) {
    if (bmvInternal || BMV_DRILL_OLD || !/^\d{4}-\d{2}$/.test(String(month || ''))) return prev.apply(this, arguments);
    // 월별 팝업이 열려 있으면 그 안에서 전환
    if (typeof agentAcctMonthlyFinal !== 'undefined' && agentAcctMonthlyFinal === account && document.querySelector('.agv-pop.bmv-pop:not(#bmv-ap .bmv-pop)')) {
      bmvDrillOpen(account, month, name); return;
    }
    bmvApOpen(account, month, name);
  };
});   // true 로 바꾸면 예전 모양(실적발생월 · 조회기간 검색 + 밑줄 탭)

renderAgentAcctMonthlyPopFinal = function (viewData, acct) {
  if (!agentAcctMonthlyFinal || agentAcctMonthlyFinal !== acct) {
    if (!agentAcctMonthlyFinal) { bmvDrill = null; bmvDrillPopH = 0; }   // 팝업을 닫으면 다음엔 월별 표부터
    return '';
  }
  bmvView = viewData;
  bmvInjectStyle();
  if (bmvDrill && bmvDrill.acct !== acct) bmvDrill = null;
  const d = bmvDrill;
  let body = '';
  if (d) {
    try { body = bmvDrillHtml(d); } catch (e) { body = ''; }
  } else {
    try { body = bmvTable(viewData, acct); } catch (e) {
      body = (typeof renderAccountMonthlyBudgetTable === 'function') ? renderAccountMonthlyBudgetTable(viewData, acct) : '';
    }
    body = body.replace(/showActualDetailModal\(/g, 'bmvDrillOpen(');   // 이 팝업 안에서는 새 팝업 대신 안에서 전환
  }
  const title = d
    ? `<button type="button" class="bmv-back" onclick="bmvDrillBack()">← 월별 표로</button>
       <strong>${escHtml(acct)} 월별 계획 / 실적 <em class="bmv-crumb">› ${escHtml(d.m)} 실적 상세${d.name ? ' · ' + escHtml(d.name) : ''}</em></strong>`
    : `<strong>${escHtml(acct)} 월별 계획 / 실적</strong>`;
  const sub = d
    ? '그 달에 확정된 실적 내역입니다. [← 월별 표로]를 누르면 보던 표로 돌아갑니다.'
    : '지난 달은 실적(확정), 이후 달은 계획입니다. 지난 달 금액을 누르면 그 달 실적 상세를 볼 수 있습니다.';
  return `
    <div class="agv-pop-dim" onclick="if(event.target===this)agentAcctMonthlySetFinal('')">
      <div class="agv-pop aglm-pop bmv-pop ${d ? 'bmv-pop-drill' : ''}"${d && bmvDrillPopH ? ' style="min-height:' + bmvDrillPopH + 'px"' : ''} role="dialog" aria-modal="true" aria-label="${escHtml(acct)} 월별 계획/실적">
        <div class="agv-pop-head">
          <div>
            <div class="bmv-title">${title}</div>
            <span>${sub}</span>
          </div>
          <button class="agv-pop-x" onclick="agentAcctMonthlySetFinal('')">✕</button>
        </div>
        <div class="agv-pop-body">${body}</div>
        <div class="agv-pop-foot">
          <button class="agv-cancel" onclick="agentAcctMonthlySetFinal('')">닫음</button>
        </div>
      </div>
    </div>`;
};

function bmvRerender() {
  // 원가 현황 '전체 현황'은 renderBudgetPage가 아니라 showBudgetSummaryGrid로 그립니다
  if (typeof budgetDetailStep !== 'undefined' && budgetDetailStep === 'summaryGrid' && typeof showBudgetSummaryGrid === 'function') showBudgetSummaryGrid();
  else renderBudgetPage();
  // 실적 상세 위 달 칸이 옆으로 넘칠 때 — 지금 보는 달이 보이게
  if (bmvDrill) requestAnimationFrame(function () {
    const s = document.querySelector('.bmv-pop .bmv-strip'), on = s && s.querySelector('.bmv-mt.on');
    if (s && on && s.scrollWidth > s.clientWidth) {
      const a = on.getBoundingClientRect(), b = s.getBoundingClientRect();
      s.scrollLeft = Math.max(0, s.scrollLeft + (a.left - b.left) - (s.clientWidth - a.width) / 2);
    }
  });
}

/* ── 공통: 달 → 열 묶기 ─────────────────────────────────────────────────
   원가조정 월별 팝업과 원가 현황(전체 현황 · 계정 예산내역)이 같이 씁니다.
   반환 { cols:[{ label, sub, group(연도 머리), idx:[달 index], kind: past|plan|sum|act, m(단일 달) }], years, pastList, pastLabel } */
function bmvColumns(months) {
  const years = [];
  months.forEach(function (m) { const y = m.slice(0, 4); if (years.indexOf(y) < 0) years.push(y); });
  if (bmvYear !== 'all' && years.indexOf(bmvYear) < 0) bmvYear = 'all';
  const pastList = months.filter(bmvIsPast);
  const pastLabel = pastList.length ? (pastList[0] + (pastList.length > 1 ? '~' + pastList[pastList.length - 1].slice(5) : '')) : '';

  // 보이는 달(연도 필터)
  const vis = months.map(function (m, i) { return { m: m, i: i, y: m.slice(0, 4), past: bmvIsPast(m) }; })
    .filter(function (x) { return bmvYear === 'all' || x.y === bmvYear; });

  const cols = [];
  if (bmvMode === 'range') {
    // 기간: 고른 달만 월별로(실적 접기 · 연도 필터 없이), 맨 앞에 기간 합계
    const r = bmvRangeFix(months);
    const inR = months.map(function (m, i) { return { m: m, i: i, y: m.slice(0, 4), past: bmvIsPast(m) }; })
      .filter(function (x) { return x.m >= r.from && x.m <= r.to; });
    if (inR.length) {
      cols.push({ label: '기간 합계', sub: r.from.slice(2).replace('-', '.') + (inR.length > 1 ? '~' + r.to.slice(2).replace('-', '.') : '') + ' · ' + inR.length + '개월',
        group: '', idx: inR.map(function (x) { return x.i; }), kind: 'sum' });
    }
    inR.forEach(function (x) { cols.push({ label: Number(x.m.slice(5)) + '월', group: x.y + '년', idx: [x.i], kind: x.past ? 'past' : 'plan', m: x.m, sub: bmvCurSub(x.m) }); });
    return { cols: cols, years: years, pastList: pastList, pastLabel: pastLabel, range: r };
  }
  if (bmvMode === 'year') {
    years.filter(function (y) { return bmvYear === 'all' || y === bmvYear; }).forEach(function (y) {
      const idx = vis.filter(function (x) { return x.y === y; });
      const allPast = idx.every(function (x) { return x.past; }), anyPast = idx.some(function (x) { return x.past; });
      cols.push({ label: y + '년', sub: allPast ? '실적' : anyPast ? '실적+계획' : '계획', group: '', idx: idx.map(function (x) { return x.i; }), kind: allPast ? 'past' : 'sum' });
    });
  } else {
    // 실적 접기: 보이는 지난 달을 한 칸으로
    const past = vis.filter(function (x) { return x.past; });
    const rest = bmvActOpen ? vis : vis.filter(function (x) { return !x.past; });
    if (!bmvActOpen && past.length) {
      cols.push({ label: '실적 합계', sub: past[0].m.slice(2) + (past.length > 1 ? '~' + past[past.length - 1].m.slice(5) : ''), group: '확정 실적', idx: past.map(function (x) { return x.i; }), kind: 'act' });
    }
    const byYear = {};
    rest.forEach(function (x) { (byYear[x.y] = byYear[x.y] || []).push(x); });
    Object.keys(byYear).sort().forEach(function (y) {
      const list = byYear[y];
      if (bmvMode === 'quarter') {
        [1, 2, 3, 4].forEach(function (q) {
          const qs = list.filter(function (x) { return Math.floor((Number(x.m.slice(5, 7)) - 1) / 3) + 1 === q; });
          if (!qs.length) return;
          const allPast = qs.every(function (x) { return x.past; });
          cols.push({ label: q + '분기', sub: Number(qs[0].m.slice(5)) + (qs.length > 1 ? '~' + Number(qs[qs.length - 1].m.slice(5)) : '') + '월', group: y + '년', idx: qs.map(function (x) { return x.i; }), kind: allPast ? 'past' : 'plan' });
        });
      } else {
        list.forEach(function (x) { cols.push({ label: Number(x.m.slice(5)) + '월', group: y + '년', idx: [x.i], kind: x.past ? 'past' : 'plan', m: x.m, sub: bmvCurSub(x.m) }); });
      }
      // 연도 합계(그 해의 보이는 달 전부 — 접힌 실적 포함)
      if (years.length > 1 || bmvMode !== 'month') {
        const all = vis.filter(function (x) { return x.y === y; });
        cols.push({ label: y + ' 합계', group: y + '년', idx: all.map(function (x) { return x.i; }), kind: 'sum' });
      }
    });
  }
  return { cols: cols, years: years, pastList: pastList, pastLabel: pastLabel };
}
// 기간 보기 — 시작 · 끝 월을 프로젝트 기간 안으로 맞춤(비어 있으면 올해, 거꾸로면 바꿈)
function bmvRangeFix(months) {
  const first = months[0], last = months[months.length - 1];
  if (!bmvFrom || !bmvTo) {
    const past = months.filter(bmvIsPast);
    const y = (past.length ? past[past.length - 1] : first).slice(0, 4);
    bmvFrom = bmvFrom || (y + '-01' < first ? first : y + '-01');
    bmvTo = bmvTo || (y + '-12' > last ? last : y + '-12');
  }
  if (bmvFrom > bmvTo) { const t = bmvFrom; bmvFrom = bmvTo; bmvTo = t; }
  if (bmvFrom < first) bmvFrom = first;
  if (bmvTo > last) bmvTo = last;
  if (bmvFrom > last) bmvFrom = last;
  if (bmvTo < first) bmvTo = first;
  return { from: bmvFrom, to: bmvTo, min: first, max: last };
}
function bmvSumIdx(arr, idx) { return idx.reduce(function (t, i) { return t + (Number(arr[i]) || 0); }, 0); }
// 공통: 연도 묶음 머리줄. fixed = [[머리 글자, 고정 열 class], …]
function bmvHead(cols, fixed) {
  const groups = [];
  cols.forEach(function (c) {
    const g = c.group || '';
    if (groups.length && groups[groups.length - 1].g === g) groups[groups.length - 1].n++;
    else groups.push({ g: g, n: 1 });
  });
  const hasGroups = groups.some(function (g) { return g.g; });
  const fx = function (rs) { return fixed.map(function (f) { return `<th class="${f[1]}"${rs ? ' rowspan="2"' : ''}>${f[0]}</th>`; }).join(''); };
  const head1 = hasGroups ? `<tr class="bmv-yr">${fx(true)}
      ${groups.map(function (g) { return `<th colspan="${g.n}" class="${g.g === '확정 실적' ? 'act' : ''}">${escHtml(g.g)}</th>`; }).join('')}</tr>` : '';
  const head2 = `<tr>${hasGroups ? '' : fx(false)}
      ${cols.map(function (c) { return `<th class="${c.kind}">${escHtml(c.label)}${c.sub ? `<i>${escHtml(c.sub)}</i>` : ''}</th>`; }).join('')}</tr>`;
  return head1 + head2;
}
// 공통: 도구줄. xlsCall = 엑셀 버튼 onclick(없으면 버튼 없음)
function bmvTools(cv, xlsCall) {
  const seg = function (k, v, label) { return `<button class="${bmvMode === v ? 'on' : ''}" onclick="bmvSet('${k}','${v}')">${label}</button>`; };
  return `
    <div class="bmv-tools">
      <div class="bmv-seg" role="tablist" aria-label="보기">${seg('mode', 'month', '월별')}${seg('mode', 'quarter', '분기별')}${seg('mode', 'year', '연도별')}${seg('mode', 'range', '기간')}</div>
      ${cv.range ? `<span class="bmv-range"><span>기간</span>
        <input type="month" value="${cv.range.from}" min="${cv.range.min}" max="${cv.range.max}" onchange="bmvSet('from',this.value)" aria-label="조회 시작 월">
        <i>~</i>
        <input type="month" value="${cv.range.to}" min="${cv.range.min}" max="${cv.range.max}" onchange="bmvSet('to',this.value)" aria-label="조회 끝 월"></span>`
      : `<label class="bmv-sel"><span>연도</span><select onchange="bmvSet('year',this.value)">
        <option value="all" ${bmvYear === 'all' ? 'selected' : ''}>전체</option>
        ${cv.years.map(function (y) { return `<option value="${y}" ${bmvYear === y ? 'selected' : ''}>${y}년</option>`; }).join('')}</select></label>`}
      <label class="bmv-sel"><span>단위</span><select onchange="bmvSet('unit',this.value)">
        ${BMV_UNITS.map(function (u) { return `<option value="${u[0]}" ${bmvUnit === u[0] ? 'selected' : ''}>${u[1]}</option>`; }).join('')}</select></label>
      ${(bmvMode !== 'year' && bmvMode !== 'range' && cv.pastList.length) ? `<button class="bmv-act ${bmvActOpen ? 'on' : ''}" onclick="bmvSet('act')"
        title="지난 달(확정 실적)을 ${bmvActOpen ? '실적 합계 한 칸으로 접습니다' : '월별로 펼칩니다'}">실적 ${cv.pastLabel} ${bmvActOpen ? '접기 ▴' : '펼치기 ▾'}</button>` : ''}
      <em class="bmv-unit">단위: ${bmvUnitInfo()[1]}</em>
      ${(xlsCall && typeof bxeMonthly === 'function') ? `<button class="bxe-btn" onclick="${xlsCall}" title="지금 보이는 표(보기 · 연도 · 단위 그대로)를 엑셀(.xlsx)로 내려받습니다">⬇ 엑셀 다운로드</button>` : ''}
    </div>`;
}
function bmvNote() {
  return '<p class="bmv-note"><b class="act"></b>확정 실적 <b class="plan"></b>계획 <b class="sum"></b>합계 · 계획(전체) = 실적 + 계획(미집행)</p>';
}

function bmvTable(viewData, acct) {
  const months = ((viewData && viewData.months) || []).map(function (x) { return x.m; });
  const rows = (typeof getMonthlyBudgetRows === 'function' ? getMonthlyBudgetRows(viewData, acct) : []) || [];
  if (!months.length || !rows.length) throw new Error('no data');
  const cv = bmvColumns(months);
  const cols = cv.cols;

  const total = { name: '합계', plan: 0, actual: 0, remain: 0, months: months.map(function () { return 0; }) };
  rows.forEach(function (r) {
    total.plan += Number(r.plan) || 0; total.actual += Number(r.actual) || 0; total.remain += Number(r.remain) || 0;
    (r.months || []).forEach(function (v, i) { total.months[i] += Number(v) || 0; });
  });
  const cell = function (r, c, isTotal) {
    const v = bmvSumIdx(r.months || [], c.idx);
    // 지난 달 한 칸이면 기존처럼 실적 상세 링크(숫자만 고른 단위로 바꿔 넣음)
    if (c.m && c.kind === 'past' && !isTotal && typeof actualCellHtml === 'function' && v) {
      return actualCellHtml(acct, c.m, r.name, v).replace(/>[^<]*<\/button>/, '>' + bmvNum(v) + '</button>');
    }
    return v ? bmvNum(v) : '<span class="bmv-zero">–</span>';
  };
  const head = bmvHead(cols, [['구분', 'bmv-fix bmv-c0'], ['계획(전체)', 'bmv-fix bmv-c1'], ['실적(확정)', 'bmv-fix bmv-c2'], ['계획(미집행)', 'bmv-fix bmv-c3']]);
  const line = function (r, isTotal) {
    return `<tr class="${isTotal ? 'bmv-total' : ''}">
      <td class="bmv-fix bmv-c0">${escHtml(r.name)}</td>
      <td class="bmv-fix bmv-c1 num">${bmvNum(r.plan)}</td>
      <td class="bmv-fix bmv-c2 num">${bmvNum(r.actual)}</td>
      <td class="bmv-fix bmv-c3 num">${bmvNum(r.remain)}</td>
      ${cols.map(function (c) { return `<td class="num ${c.kind}">${cell(r, c, isTotal)}</td>`; }).join('')}</tr>`;
  };
  const q = escHtml(String(acct).replace(/'/g, "\\'"));
  return `<div class="bmv-wrap">${bmvTools(cv, "bxeMonthly('" + q + "', this)")}
    <div class="bmv-scroll">
      <table class="bmv-table">
        <thead>${head}</thead>
        <tbody>${rows.map(function (r) { return line(r, false); }).join('')}${line(total, true)}</tbody>
      </table>
    </div>
    ${bmvNote()}</div>`;
}

function bmvInjectStyle() {
  if (document.getElementById('bmv-style')) return;
  const st = document.createElement('style');
  st.id = 'bmv-style';
  st.textContent = `
  .agv-pop.bmv-pop { width:min(1180px, 96vw) !important; }
  /* 팝업 안 실적 상세 — 제목 줄: [← 월별 표로] 계정 월별 계획 / 실적 › 2026-10 실적 상세 */
  .bmv-pop .bmv-title { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .bmv-pop .bmv-title strong { display:inline; }
  .bmv-pop .bmv-crumb { font-style:normal; font-weight:700; color:#4b5563; margin-left:4px; }
  .bmv-pop .bmv-back { height:32px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; font:inherit;
    font-size:13px; font-weight:800; color:#334155; cursor:pointer; white-space:nowrap; }
  .bmv-pop .bmv-back:hover { border-color:#2f5bea; color:#2f5bea; background:#f5f8ff; }
  /* [2026.11.24] 실적 상세 정리 — 원가조정 계정 상세와 같은 규칙으로 차분하게
     ① 조회 조건: 회색 상자 → 한 줄(이름 · 값 나란히, 버튼은 오른쪽)  ② 세부 탭: 검정으로 꽉 찬 브라우저 탭 → 글자 + 계정색 밑줄(계정 상세 세부 탭과 같은 모양)
     ③ [엑셀 다운로드]: 초록 → 흰 버튼, 탭 줄 오른쪽 끝으로  ④ 표: 머리 왼쪽 정렬 · 연한 회색, 금액만 오른쪽, 합계는 굵게(파란 바탕 없음) */
  .bmv-pop .bmv-drill { display:grid; grid-template-columns:1fr auto; align-items:end; column-gap:16px; row-gap:14px; }
  .bmv-pop .bmv-drill > .actual-detail-filter, .bmv-pop .bmv-drill > .actual-detail-table-wrap { grid-column:1 / -1; }
  .bmv-pop .bmv-drill .actual-detail-filter { display:flex !important; align-items:center; gap:22px; margin:0 !important; padding:0 0 12px !important;
    background:transparent !important; border:0 !important; border-bottom:1px solid #e5e8ed !important; border-radius:0 !important; box-shadow:none !important; }
  .bmv-pop .bmv-drill .actual-detail-filter label { display:flex !important; flex-direction:row !important; align-items:center; gap:8px; flex:none !important; width:auto !important; margin:0 !important; }
  .bmv-pop .bmv-drill .actual-detail-filter label span { font-size:13.5px !important; font-weight:600 !important; color:#4b5563 !important; white-space:nowrap; }
  .bmv-pop .bmv-drill .actual-detail-filter input { width:110px !important; height:34px !important; box-sizing:border-box; border:1px solid #cbd5e1 !important; border-radius:6px !important;
    background:#fff !important; padding:0 10px !important; font:inherit; font-size:14px !important; font-weight:600 !important; color:#111827 !important; box-shadow:none !important; }
  .bmv-pop .bmv-drill .actual-detail-filter .labor-sub-btn { margin-left:auto !important; }
  /* [검색]은 원가조정 화면 공통 주 버튼(파랑) 그대로 — 모양 · 크기만 맞춤. [초기화]는 흰 버튼 */
  .bmv-pop .bmv-drill .actual-detail-filter button { height:34px !important; padding:0 14px !important; border-radius:6px !important; font-size:13.5px !important; font-weight:700 !important; box-shadow:none !important; }
  .bmv-pop .bmv-drill .actual-detail-filter .labor-sub-btn { background:#fff !important; color:#1c2432 !important; border:1px solid #cbd5e1 !important; }
  .bmv-pop .bmv-drill .actual-detail-tabs { display:flex !important; flex-wrap:wrap; gap:0 30px !important; padding:0 2px !important; margin:0 !important;
    background:transparent !important; border:0 !important; border-bottom:1px solid #d5dae1 !important; }
  .bmv-pop .bmv-drill .actual-detail-tabs button { position:relative; width:auto !important; min-width:0 !important; max-width:none !important; text-align:left !important; height:auto !important; flex:none !important; padding:8px 2px 10px !important; margin:0 0 -1px !important;
    background:transparent !important; border:0 !important; border-bottom:4px solid transparent !important; border-radius:0 !important; box-shadow:none !important;
    font:inherit; font-size:15px !important; font-weight:500 !important; color:#4b5563 !important; white-space:nowrap; cursor:pointer; }
  .bmv-pop .bmv-drill .actual-detail-tabs button + button::before { content:""; position:absolute; left:-15px; top:30%; height:40%; width:1px; background:#a3abb7; }
  .bmv-pop .bmv-drill .actual-detail-tabs button:hover { color:#111827 !important; }
  .bmv-pop .bmv-drill .actual-detail-tabs button.active { color:#111827 !important; font-weight:800 !important; border-bottom-color:var(--acc,#1c2432) !important; }
  .bmv-pop .bmv-drill .actual-detail-toolbar { margin:0 0 6px !important; padding:0 !important; border:0 !important; background:transparent !important; }
  .bmv-pop .bmv-drill .actual-detail-toolbar .bxe-btn { background:#fff !important; color:#1c2432 !important; border:1px solid #cbd5e1 !important; box-shadow:none !important; }
  .bmv-pop .bmv-drill .actual-detail-toolbar .bxe-btn:hover { background:#f8fafc !important; border-color:#94a3b8 !important; }
  .bmv-pop .bmv-drill .actual-detail-toolbar .bxe-btn svg { color:#4b5563 !important; stroke:currentColor; }
  .bmv-pop .bmv-drill .actual-detail-table-wrap { max-height:none; margin:0; padding:0; border:0 !important; }
  .bmv-pop .bmv-drill .actual-detail-table { border-collapse:collapse; width:100%; }
  .bmv-pop .bmv-drill .actual-detail-table th { background:#f6f7f9 !important; color:#4b5563 !important; font-size:13.5px !important; font-weight:700 !important;
    text-align:left !important; padding:10px 14px !important; border:0 !important; border-bottom:1px solid #d5dae1 !important; }
  .bmv-pop .bmv-drill .actual-detail-table td { text-align:left !important; padding:11px 14px !important; font-size:14.5px !important; color:#1c2432 !important;
    border:0 !important; border-bottom:1px solid #eef0f3 !important; background:#fff !important; }
  .bmv-pop .bmv-drill .actual-detail-table th:last-child, .bmv-pop .bmv-drill .actual-detail-table td.num { text-align:right !important; font-variant-numeric:tabular-nums; }
  .bmv-pop .bmv-drill .actual-detail-table td.num { font-weight:700 !important; }
  .bmv-pop .bmv-drill .actual-detail-table th:first-child, .bmv-pop .bmv-drill .actual-detail-table td:first-child { width:48px; color:#6b7280 !important; }
  .bmv-pop .bmv-drill .actual-detail-table tr.total td { background:#fff !important; font-weight:800 !important; color:#111827 !important;
    border-top:1.5px solid #475569 !important; border-bottom:0 !important; }
  .bmv-tools { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0 0 10px; }
  .bmv-seg { display:inline-flex; gap:3px; padding:3px; background:#f1f5f9; border-radius:9px; }
  .bmv-seg button { border:0; background:transparent; border-radius:7px; padding:6px 12px; font:inherit; font-size:12.5px; font-weight:800; color:#64748b; cursor:pointer; }
  .bmv-seg button.on { background:#fff; color:#0b1220; box-shadow:0 1px 3px rgba(15,23,42,.12); }
  .bmv-sel { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#64748b; }
  .bmv-sel select { border:1px solid #cbd5e1; border-radius:8px; padding:6px 8px; font:inherit; font-size:12.5px; color:#0b1220; background:#fff; }
  .bmv-range { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#64748b; }
  .bmv-range input { height:30px; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:8px; padding:0 8px; font:inherit; font-size:12.5px; color:#0b1220; background:#fff; }
  .bmv-range input:focus { outline:2px solid #bfdbfe; border-color:#2563eb; }
  .bmv-range i { font-style:normal; color:#94a3b8; }
  .bmv-act { border:1px solid #cbd5e1; background:#fff; color:#334155; border-radius:8px; padding:6px 12px; font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; }
  .bmv-act.on { border-color:#94a3b8; background:#f8fafc; }
  .bmv-unit { margin-left:auto; font-style:normal; font-size:11.5px; font-weight:800; color:#94a3b8; }
  .bmv-scroll { overflow:auto; max-height:min(62vh, 560px); border:1px solid #e2e8f0; border-radius:12px; }
  .bmv-table { border-collapse:separate; border-spacing:0; width:max-content; min-width:100%; font-size:12.5px; }
  .bmv-table th, .bmv-table td { padding:7px 10px; border-bottom:1px solid #eef2f7; white-space:nowrap; background:#fff; }
  .bmv-table thead th { position:sticky; top:0; z-index:2; background:#f8fafc; color:#475569; font-weight:800; font-size:11.5px; text-align:center; border-bottom:1px solid #e2e8f0; }
  .bmv-table thead tr.bmv-yr th { top:0; }
  .bmv-table thead tr.bmv-yr + tr th { top:31px; }
  .bmv-table thead th i { display:block; font-style:normal; font-weight:700; font-size:10px; color:#94a3b8; margin-top:1px; }
  .bmv-table td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .bmv-fix { position:sticky; z-index:1; }
  .bmv-table thead .bmv-fix { z-index:3; }
  .bmv-c0 { left:0; min-width:120px; text-align:left !important; font-weight:800; color:#1c2432; }
  .bmv-c1 { left:120px; min-width:96px; } .bmv-c2 { left:216px; min-width:96px; } .bmv-c3 { left:312px; min-width:96px; box-shadow:inset -1px 0 0 #e2e8f0; }
  .bmv-table td.bmv-c1 { font-weight:800; color:#0b1220; }
  .bmv-table th.act, .bmv-table td.act, .bmv-table th.past, .bmv-table td.past { background:#f6f7f9; color:#64748b; }
  .bmv-table thead th.act, .bmv-table thead th.past { background:#eef1f5; }
  .bmv-table th.sum, .bmv-table td.sum { background:#f2f7ff; font-weight:800; color:#1d4ed8; }
  .bmv-table thead th.sum { background:#e6f0ff; }
  .bmv-table tr.bmv-total td { background:#f8fafc; font-weight:900; color:#0b1220; border-top:1px solid #cbd5e1; }
  .bmv-table tr.bmv-total td.sum { background:#e6f0ff; color:#1d4ed8; }
  .bmv-table tbody tr:hover td { background:#fbfdff; }
  .bmv-table .actual-month-link { border:0; background:none; padding:0; font:inherit; color:inherit; text-decoration:underline dotted; cursor:pointer; }
  .bmv-zero { color:#cbd5e1; }
  .bmv-note { margin:8px 2px 0; font-size:11.5px; color:#94a3b8; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .bmv-note b { display:inline-block; width:10px; height:10px; border-radius:3px; border:1px solid #e2e8f0; }
  .bmv-note b.act { background:#f6f7f9; } .bmv-note b.plan { background:#fff; } .bmv-note b.sum { background:#e6f0ff; margin-left:6px; }
  /* [2026.11.27] 실적 상세 위 「해당 줄」 — 그 세부 항목의 지난 달 실적. 지금 보는 달은 파란 밑줄 · 굵게, 다른 달은 눌러서 이동 */
  .bmv-strip-box { margin:0 0 2px; }
  .bmv-strip-cap { display:flex; align-items:baseline; gap:10px; margin:0 2px 8px; }
  .bmv-strip-cap > b { font-size:15px; font-weight:800; color:#111827; }
  .bmv-strip-cap > span { font-size:12.5px; color:#6b7280; }
  .bmv-strip-cap > em { margin-left:auto; font-style:normal; font-size:13px; color:#4b5563; }
  .bmv-strip-cap > em b { font-size:15px; font-weight:800; color:#111827; font-variant-numeric:tabular-nums; margin-left:4px; }
  /* 달 칸 — 칸이 많으면(여러 해) 가로로 넘김. 한 칸 = 위 달 · 아래 금액, 누를 수 있는 칸은 흰 바탕 + 테두리 */
  .bmv-strip { display:grid; grid-template-columns:repeat(var(--n), minmax(var(--tw, 78px), 1fr)); gap:6px; overflow-x:auto; padding-bottom:4px; scroll-behavior:auto; }
  .bmv-mt { display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:0; padding:7px 10px 8px; border:1px solid #dfe3ea;
    border-radius:8px; background:#fff; font:inherit; text-align:left; cursor:pointer; transition:border-color .12s, background .12s; }
  button.bmv-mt:hover { border-color:#8fa8ef; background:#f7f9ff; }
  button.bmv-mt:focus-visible { outline:2px solid #2f5bea; outline-offset:1px; }
  .bmv-mt-m { font-size:12.5px; font-weight:700; color:#6b7280; white-space:nowrap; }
  .bmv-mt-v { font-size:14.5px; font-weight:800; color:#1f2937; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .bmv-mt.on { border-color:#2f5bea; background:#2f5bea; cursor:default; }
  .bmv-mt.on .bmv-mt-m { color:#dbe5ff; } .bmv-mt.on .bmv-mt-v { color:#fff; }
  .bmv-mt.off { background:#f6f7f9; border-color:#eceef2; cursor:default; }
  .bmv-mt.off .bmv-mt-v { color:#b8bfca; font-weight:600; }
  .bmv-strip.long .bmv-mt { padding:7px 8px 8px; } .bmv-strip.long .bmv-mt-v { font-size:13px; }
  .bmv-pop .bmv-drill2 .bih-bar, .bmv-pop .blf-act-body .bmv-strip-box + .bih-bar { margin:14px 0 8px; flex-wrap:wrap; }
  .bmv-pop .bmv-drill2 .bih-wrap { max-height:none; }
  .bmv-pop .bmv-drill2 .bih-seg { flex-wrap:wrap; }
  .bmv-pop .bmv-drill2 .bih-excel { margin-left:auto; }
  .bmv-pop .bmv-drill2 .bih-table th, .bmv-pop .bmv-drill2 .bih-table td { padding-top:9px; padding-bottom:9px; }
  .bmv-pop .bmv-drill2 .bih-table th, .bmv-pop .bmv-drill2 .bih-table td { text-align:left !important; }
  .bmv-pop .bmv-drill2 .bih-table th.num, .bmv-pop .bmv-drill2 .bih-table td.num { text-align:right !important; }
  .bmv-pop .bmv-drill2 .bih-table td.bmv-tot { font-weight:800; background:#f8fafc; border-top:1px solid #e5e7eb; }
  `;
  document.head.appendChild(st);
}
