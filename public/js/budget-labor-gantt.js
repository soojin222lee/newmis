// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 > 인건비 — 인력 투입 일정(간트) 팝업    작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: [2026.11.27] 실투입인건비 인력표 아래에 펼쳐 보던 「인력 투입 일정」 간트를 버튼 + 팝업으로 옮깁니다(사용자 요청).
//   - 여는 곳: 인력표 위 버튼 줄 [인력 투입 일정] ([월별 투입계획] 왼쪽). 화면 안의 간트(.aglg)와 펼치기 줄은 뺌.
//   - 한눈에: 팝업은 넓게(최대 1320px), 왼쪽 「인력 · 투입기간」 칸은 가로로 넘겨도 고정, 머리(연 · 월)는 세로로 넘겨도 고정.
//   - 덜 빡빡하게: 줄 높이를 넉넉히(42px) · 줄마다 옅은 구분, 막대 안 글자 없음(막대에 마우스 → 안내 상자 blgTip: 기간 · 실적/계획 MM).
//   - [v2] 이어지는 달은 실적 · 계획 상관없이 막대 하나(실적 부분 진한 파랑 → 계획 부분 옅은 파랑, 끊기지 않음). 두께는 모두 같음.
//     시작 · 끝이 같은 사람이 많아도 이름 칸에 기간 · MM 이 따로 있어 구분됨. 시작 월 → 끝 월 → 이름 순.
//   - 실적 발생한 달은 진한 파랑(실적 확정, agentLaborActualDoneFinal), 계획인 달은 옅은 파랑. 진행 중인 달(CUR_YM)은 세로선.
//   - 신규추가 · 철수(예산 조정안 반영 중) 인력은 이름 옆 꼬리표로(막대 색은 실적/계획만 씀).
//   데이터(목업): 인력표와 같은 사람 · 같은 월별 MM(agentLaborRowsFinal · agentLaborMonthsFinal).
//   공유 파일은 고치지 않고 renderAgentLaborDetailFinal 출력만 감쌉니다. budget-labor-plan.js 뒤에 로드.
// ═══════════════════════════════════════════════════════════════════════════

var blgOpen = false;

function blgEsc(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s); }
function blgRows() { return (typeof agentLaborRowsFinal === 'function') ? agentLaborRowsFinal() : []; }
function blgMonthsOf(r) { return (typeof agentLaborMonthsFinal === 'function') ? agentLaborMonthsFinal(r) : []; }
function blgDone(m) { return (typeof agentLaborActualDoneFinal === 'function') ? !!agentLaborActualDoneFinal(m) : false; }
function blgInfo(name) { return (typeof blfInfo === 'function') ? blfInfo(name) : {}; }
function blgPrj() {
  const list = (typeof EXEC_BUDGET_PROJECTS !== 'undefined') ? EXEC_BUDGET_PROJECTS : [];
  const k = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  return list.find(x => x.key === k) || list.find(x => x.key === 'budgetMock') || { no: '', name: '' };
}
function blgNext(m) { const y = +m.slice(0, 4), mo = +m.slice(5, 7); return mo === 12 ? (y + 1) + '-01' : y + '-' + ('0' + (mo + 1)).slice(-2); }
function blgShort(m) { return m ? m.slice(2, 4) + '.' + m.slice(5, 7) : ''; }

function blgData() {
  const people = blgRows().map(r => {
    const ms = blgMonthsOf(r).filter(x => x.mm > 0);
    const by = {};
    ms.forEach(x => { by[x.m] = x.mm; });
    const mm = ms.reduce((t, x) => t + x.mm, 0);
    const act = ms.filter(x => blgDone(x.m)).reduce((t, x) => t + x.mm, 0);
    return { r, by, mm, act, start: ms.length ? ms[0].m : String(r.start || '').slice(0, 7), end: ms.length ? ms[ms.length - 1].m : String(r.end || '').slice(0, 7) };
  }).filter(p => p.start);
  people.sort((a, b) => a.start === b.start ? (a.end === b.end ? String(a.r.name).localeCompare(String(b.r.name)) : (a.end < b.end ? -1 : 1)) : (a.start < b.start ? -1 : 1));
  let lo = '', hi = '';
  people.forEach(p => { if (!lo || p.start < lo) lo = p.start; if (!hi || p.end > hi) hi = p.end; });
  const months = [];
  if (lo && hi) { let m = lo; while (m <= hi && months.length < 120) { months.push(m); m = blgNext(m); } }
  return { people, months };
}

function blgMonthOpen() {                               // crud R — 인력 투입 일정(간트) 팝업 열기(조회)
  blgOpen = true;
  blgPaint();
  // 진행 중인 달이 보이게 가로 위치 맞춤
  requestAnimationFrame(() => {
    const sc = document.querySelector('#blg-pop .blg-scroll'), now = sc && sc.querySelector('.blg-mh.now');
    if (sc && now) sc.scrollLeft = Math.max(0, now.offsetLeft - sc.clientWidth / 2);
  });
}
// 막대에 마우스 → 바로 뜨는 안내 상자(기본 title 말풍선은 늦게 뜨거나 안 보일 때가 있어서)
function blgTip(e, el) {                                // crud N — 막대 안내 상자(기간 · 실적/계획 MM)
  let tip = document.getElementById('blg-tip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'blg-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  const lines = String(el.getAttribute('data-tip') || '').split('|');
  const html = lines.map((t, i) => i === 0 ? '<b>' + t + '</b>' : '<span class="' + (/^실적/.test(t) ? 'blg-k-ac' : /^계획/.test(t) ? 'blg-k-pl' : '') + '">' + t + '</span>').join('');
  if (tip.innerHTML !== html) tip.innerHTML = html;
  tip.style.display = 'block';
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = e.clientX + 14, y = e.clientY + 16;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
  if (y + h > window.innerHeight - 8) y = e.clientY - h - 12;
  tip.style.left = Math.round(x) + 'px'; tip.style.top = Math.round(y) + 'px';
}
function blgTipOff() {                                  // crud N — 막대 안내 상자 닫기
  const tip = document.getElementById('blg-tip');
  if (tip) tip.style.display = 'none';
}
function blgClose() {                                   // crud N — 팝업 닫기
  blgTipOff();
  blgOpen = false;
  const el = document.getElementById('blg-pop');
  if (el) el.remove();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && blgOpen) blgClose(); });

function blgPaint() {
  if (!blgOpen) return;
  let el = document.getElementById('blg-pop');
  if (!el) { el = document.createElement('div'); el.id = 'blg-pop'; document.body.appendChild(el); }
  const p = blgPrj();
  const { people, months } = blgData();
  const N = months.length;
  const now = (typeof CUR_YM !== 'undefined') ? CUR_YM : '';
  const yrs = [];
  months.forEach(m => { const y = m.slice(0, 4); if (yrs.length && yrs[yrs.length - 1].y === y) yrs[yrs.length - 1].n++; else yrs.push({ y, n: 1 }); });
  const totMm = people.reduce((t, x) => t + x.mm, 0), totAct = people.reduce((t, x) => t + x.act, 0);

  const head = '<div class="blg-c blg-h0 blg-sticky">인력</div><div class="blg-c blg-h0 blg-sticky2">투입기간 · MM</div>'
    + yrs.map(v => `<div class="blg-c blg-yh" style="grid-column:span ${v.n}">${v.y}년</div>`).join('')
    + '<div class="blg-c blg-h1 blg-sticky"></div><div class="blg-c blg-h1 blg-sticky2"></div>'
    + months.map(m => `<div class="blg-c blg-mh${m === now ? ' now' : ''}${blgDone(m) ? ' done' : ''}">${Number(m.slice(5, 7))}월</div>`).join('');

  const body = people.map((x, i) => {
    const r = x.r, info = blgInfo(r.name);
    const tag = r.state === '신규추가' ? '<em class="blg-tag new">신규</em>' : r.state === '철수' ? '<em class="blg-tag out">철수</em>' : '';
    const sub = [info.pos, r.org].filter(Boolean).join(' · ');
    // [v2] 이어지는 달은 실적 · 계획 상관없이 막대 하나 — 실적 부분은 진한 색, 계획 부분은 옅은 색으로 한 막대 안에서 나눔(끊기지 않게).
    //   두께는 모두 같음(일부 투입 달도 같은 두께, MM은 안내 상자에)
    const spans = [];
    months.forEach((m, k) => {
      const v = x.by[m];
      if (!v) return;
      const last = spans[spans.length - 1];
      if (last && last.to === k - 1) { last.to = k; last.ms.push(m); }
      else spans.push({ from: k, to: k, ms: [m] });
    });
    const nowIdx = months.indexOf(now);
    const track = spans.map(u => {
      const len = u.to - u.from + 1;
      const acMs = u.ms.filter(blgDone), plMs = u.ms.filter(m => !blgDone(m));
      const sum = list => list.reduce((t, m) => t + (x.by[m] || 0), 0);
      const pct = Math.round(acMs.length / len * 10000) / 100;
      const bg = pct >= 100 ? 'var(--blg-ac)' : pct <= 0 ? 'var(--blg-pl)'
        : `linear-gradient(to right, var(--blg-ac) 0 ${pct}%, var(--blg-pl) ${pct}% 100%)`;
      const rng = list => list.length ? (list.length === 1 ? list[0] : list[0] + ' ~ ' + list[list.length - 1]) : '';
      const tip = [
        blgEsc(r.name) + ' · ' + rng(u.ms) + ' · ' + sum(u.ms).toFixed(1) + 'MM',
        acMs.length ? '실적(확정) ' + rng(acMs) + ' · ' + sum(acMs).toFixed(1) + 'MM' : '',
        plMs.length ? '계획 ' + rng(plMs) + ' · ' + sum(plMs).toFixed(1) + 'MM' : '',
        u.ms.some(m => x.by[m] < 1) ? '일부 투입 달: ' + u.ms.filter(m => x.by[m] < 1).map(m => Number(m.slice(5, 7)) + '월 ' + x.by[m].toFixed(1)).join(', ') : '',
      ].filter(Boolean).join('|');
      return `<i class="blg-bar" style="grid-column:${u.from + 1} / ${u.to + 2};background:${bg}" data-tip="${tip}"
        onmouseenter="blgTip(event, this)" onmousemove="blgTip(event, this)" onmouseleave="blgTipOff()"></i>`;
    }).join('') + (nowIdx >= 0 ? `<i class="blg-now" style="grid-column:${nowIdx + 1}"></i>` : '');
    const cells = `<div class="blg-c blg-track">${track}</div>`;
    return `<div class="blg-row${i % 2 ? ' odd' : ''}">
      <div class="blg-c blg-name blg-sticky"><b>${blgEsc(r.name)}</b>${tag}<span>${blgEsc(sub)}</span></div>
      <div class="blg-c blg-per blg-sticky2"><b>${blgShort(x.start)} ~ ${blgShort(x.end)}</b><span>${x.mm.toFixed(1)}MM${x.act ? ' · 실적 ' + x.act.toFixed(1) : ''}</span></div>
      ${cells}</div>`;
  }).join('');

  el.innerHTML = `
    <div class="bih-dim" onclick="if(event.target===this)blgClose()">
      <div class="bih-pop blg-pop" role="dialog" aria-modal="true" aria-label="인력 투입 일정">
        <div class="bih-head">
          <div><strong>인력 투입 일정</strong><span>${blgEsc(p.name)} · ${blgEsc(p.no)}</span></div>
          <button class="bih-x" onclick="blgClose()" aria-label="닫기">✕</button>
        </div>
        <div class="bih-body">
          <div class="blg-top">
            <span class="blg-sum">${people.length}명 · ${N ? months[0] + ' ~ ' + months[N - 1] + ' · ' + N + '개월' : ''} · 계획 ${totMm.toFixed(1)}MM · 실적 ${totAct.toFixed(1)}MM</span>
            <span class="blg-key"><i class="ac"></i>실적 발생(확정) <i class="pl"></i>계획 <i class="nowk"></i>진행 중${now ? '(' + Number(now.slice(5, 7)) + '월)' : ''}</span>
          </div>
          ${people.length ? `<div class="blg-scroll"><div class="blg-grid" style="--n:${N}">${head}${body}</div></div>`
            : '<p class="bih-note">투입 계획이 있는 인력이 없습니다.</p>'}
          <p class="bih-note">막대에 마우스를 올리면 기간 · 실적/계획 MM이 보입니다. 0.5MM처럼 일부만 투입한 달도 안내 상자에 표시됩니다.</p>
        </div>
        <div class="bih-foot"><button type="button" class="bih-close" onclick="blgClose()">닫기</button></div>
      </div>
    </div>`;
}

// ── 인건비 상세: [인력 투입 일정] 버튼 넣기 + 화면 안 간트 빼기 ──
function blgApply(html) {
  if (!html || typeof document === 'undefined') return html;
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const root = tpl.content;
    root.querySelectorAll('.aglg').forEach(g => g.remove());          // 화면 안 간트 → 팝업으로
    if (!root.querySelector('.blg-open-btn')) {
      const at = root.querySelector('.aglb-bar .blp-month-btn') || root.querySelector('.aglb-bar .aglb-xpand-btn');
      if (at) at.insertAdjacentHTML('beforebegin', '<button class="bxe-btn blg-open-btn" onclick="blgMonthOpen()" title="인력마다 투입 기간을 달력 막대로 한눈에 봅니다(실적 발생한 달은 진한 색)">인력 투입 일정</button>');
    }
    return tpl.innerHTML;
  } catch (e) { return html; }
}
(function () {
  const before = window.renderAgentLaborDetailFinal;
  if (typeof before !== 'function') return;
  window.renderAgentLaborDetailFinal = function () { return blgApply(before.apply(this, arguments)); };
})();

(function blgStyle() {
  if (typeof document === 'undefined' || document.getElementById('blg-style')) return;
  const st = document.createElement('style');
  st.id = 'blg-style';
  st.textContent = `
  #blg-pop .bih-pop.blg-pop { width:min(1320px, 100%); }
  .blg-top { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin:0 0 12px; }
  .blg-sum { font-size:14px; font-weight:700; color:#1f2937; }
  .blg-key { margin-left:auto; display:inline-flex; align-items:center; gap:6px; font-size:13px; color:#4b5563; }
  .blg-key i { display:inline-block; width:18px; height:10px; border-radius:3px; margin-left:8px; }
  .blg-key i.ac { background:#2f5bea; } .blg-key i.pl { background:#c3d2fa; }
  .blg-key i.nowk { width:2px; height:14px; border-radius:1px; background:#e2554f; }
  #blg-tip { position:fixed; z-index:10000; display:none; max-width:340px; padding:9px 12px; background:#fff; border:1px solid #d5dbe4; border-radius:8px;
    box-shadow:0 6px 18px rgba(20,30,50,.14); pointer-events:none; font-size:13px; line-height:1.55; color:#374151; }
  #blg-tip b { display:block; font-size:13.5px; font-weight:800; color:#111827; margin-bottom:2px; }
  #blg-tip span { display:block; font-variant-numeric:tabular-nums; border:0; padding:0; background:none; }
  #blg-tip span.blg-k-ac::before, #blg-tip span.blg-k-pl::before { content:""; display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:6px; vertical-align:-1px; }
  #blg-tip span.blg-k-ac::before { background:#2f5bea; } #blg-tip span.blg-k-pl::before { background:#c3d2fa; }
  .blg-scroll { overflow:auto; max-height:min(62vh, 640px); border:1px solid #e5e7eb; border-radius:10px; }
  .blg-grid { display:grid; grid-template-columns:200px 132px repeat(var(--n), minmax(44px, 1fr)); min-width:max-content; }
  .blg-row { display:contents; }
  .blg-c { box-sizing:border-box; min-width:0; }
  /* 머리 — 연 · 월, 세로로 넘겨도 위에 고정 */
  .blg-h0, .blg-yh { position:sticky; top:0; z-index:3; height:30px; display:flex; align-items:center; padding:0 10px; background:#f6f7f9;
    font-size:12.5px; font-weight:800; color:#374151; border-bottom:1px solid #eceef2; }
  .blg-yh { border-left:1px solid #e5e7eb; }
  .blg-h1, .blg-mh { position:sticky; top:30px; z-index:3; height:30px; display:flex; align-items:center; justify-content:center; background:#f6f7f9;
    font-size:12.5px; font-weight:700; color:#6b7280; border-bottom:1px solid #e5e7eb; }
  .blg-mh.done { color:#1e3a8a; }
  .blg-mh.now { color:#c2352f; font-weight:800; }
  .blg-h0.blg-sticky, .blg-h1.blg-sticky, .blg-h0.blg-sticky2, .blg-h1.blg-sticky2 { z-index:5; }
  /* 왼쪽 두 칸 — 가로로 넘겨도 고정 */
  .blg-sticky { position:sticky; left:0; z-index:2; }
  .blg-sticky2 { position:sticky; left:200px; z-index:2; border-right:1px solid #e5e7eb; }
  .blg-name, .blg-per { min-height:42px; padding:6px 10px; background:#fff; display:flex; flex-direction:column; justify-content:center; border-bottom:1px solid #f0f2f5; }
  .blg-name { flex-direction:row; flex-wrap:wrap; justify-content:flex-start; align-items:center; column-gap:6px; align-content:center; }
  .blg-name b { font-size:14px; font-weight:800; color:#111827; }
  .blg-name span { flex-basis:100%; font-size:12px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .blg-per b { font-size:13px; font-weight:700; color:#1f2937; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .blg-per span { font-size:12px; color:#6b7280; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .blg-tag { font-style:normal; font-size:11px; font-weight:800; line-height:17px; padding:0 6px; border-radius:5px; }
  .blg-tag.new { color:#166534; background:#e8f7ee; } .blg-tag.out { color:#b42318; background:#fdecea; }
  .blg-row.odd > .blg-name, .blg-row.odd > .blg-per, .blg-row.odd > .blg-track { background-color:#fafbfc; }
  /* 달 칸 — 한 줄 전체를 달 수만큼 나눈 격자. 세로 칸선은 배경으로, 막대는 이어지는 달을 한 개로(양 끝만 둥글게) */
  .blg-track { grid-column:span var(--n); display:grid; grid-template-columns:repeat(var(--n), minmax(44px, 1fr)); align-items:center; min-height:42px;
    background-color:#fff; background-image:repeating-linear-gradient(to right, #eef0f3 0 1px, transparent 1px calc(100% / var(--n)));
    border-bottom:1px solid #f0f2f5; }
  #blg-pop { --blg-ac:#2f5bea; --blg-pl:#c3d2fa; }
  /* 막대 — 이어지는 달은 하나(실적 부분 진한 색 · 계획 부분 옅은 색), 두께는 모두 같음 */
  .blg-bar { grid-row:1; display:block; height:18px; margin:0 4px; border-radius:6px; z-index:1; cursor:default; }
  .blg-bar:hover { box-shadow:0 0 0 2px rgba(47,91,234,.25); }
  .blg-now { grid-row:1; align-self:stretch; justify-self:center; width:2px; background:#e2554f; opacity:.55; z-index:2; pointer-events:none; }
  `;
  document.head.appendChild(st);
})();
