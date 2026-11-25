// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 > 외주비 · 재료비 — 실적(검수) 금액 → 실적조회(검수 이력) 팝업    작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 회의(2026.11.24) "실적 금액 클릭 시 언제 · 얼마가 검수되었는지 월별 · 건별 검수 이력을 보는 상세 팝업".
//   - 대상: 외주비 실투입대상 외주비 표(table.agos-flat) · 재료비 상품재료비 표(table.agmg)의 실적(검수) 칸.
//     PO가 있고 실적이 0보다 큰 줄만 금액이 링크가 됩니다(PO번호로 데이터를 찾음 — ERP 실적 연동 키도 PO번호).
//   - 팝업: 구매 금액 · 검수 완료 · 미검수 요약 → [월별 | 건별] + [엑셀 다운로드].
//       월별 = 월 · 계획 · 검수 · 계획 대비 · 누적 검수 · 건수 (계획과 다른 달에 들어온 검수가 보이게) — 신규
//       건별 = AS-IS(프로미스) 실적조회 팝업 칸 그대로 — 회의 원칙 "AS-IS 필드는 삭제 합의 전까지 유지"
//         재료비: its-front MaterialCostAcrsPopup.vue (재료비 탭, /erpPrjAcrses erpAccsCd 625101)
//           번호 · 구분 · 실적발생일 · 실적금액 | AP(AP번호 · AP Date · AP 금액 · 예상지급일)
//           | GR(GR번호 · GR Date · 검수금액) | PO(PO번호 · PO명 · PO Date · Vendor · PO 금액 · 구매담당자)
//           | PR(PR번호 · PR Date · PR 금액 · 요청자)   ※ 왼쪽 4칸 고정, 나머지 가로 스크롤(AS-IS와 같음)
//         외주비: its-front outsideOrderExpenses/popup/AcrsPopup.vue (실투입외주비 탭, findExternalLaborCost)
//           NO · 실적발생월 · 전표번호 · 성명 · 기술등급 · 회사 · 소급여부 · 실제 투입월 · 실투입 MM · 실투입 외주비 · 발생일자
//           + 실적발생월(+회사)별 소계 줄(AS-IS makeSubTotal). PO 1건 = 업체 1곳이라 월별 소계와 같음.
//       AS-IS 팝업의 실적발생월 기간 검색 · 탭(감가상각비 · 공사/MA · 기타)은 PO 1건을 여는 팝업이라 두지 않음.
//   - 검수 이력 데이터는 목업입니다. 외주비는 PO 월별 계획(pos[].plan)을 앞달부터 채워 실적 합계만큼 나누고
//     견적 등급(quote.grades) 비율로 사람(건)을 쪼갭니다. 재료비는 기존 inspections[{m, amount}]를 1건씩 씁니다.
//     전표 · AP · GR · PR 번호는 PO번호 · 월로 만든 고정값(다시 열어도 같음).
//   공유 파일(budget-agent-console.js)은 고치지 않습니다. 계정 상세 렌더러 출력만 감쌉니다.
//   엑셀은 budget-excel-export.js(bxeSave · bxeSheet · bxeTableRows)를 씁니다 — 그 파일 뒤에 로드.
// ═══════════════════════════════════════════════════════════════════════════

var bihState = null;   // { kind: 'os' | 'mat', po, view: 'month' | 'case' }

function bihEsc(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s); }
function bihNum(n) { return typeof fmt === 'function' ? fmt(n) : String(n); }
function bihWon(n) { return bihNum(n) + '원'; }
function bihHash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000000; return h; }
function bihPad(n, w) { return String(n).padStart(w, '0'); }
function bihLastDay(ym) { const [y, m] = ym.split('-').map(Number); return ym + '-' + bihPad(new Date(y, m, 0).getDate(), 2); }
function bihAddDays(ymd, n) {
  const d = new Date(String(ymd).slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return ymd;
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + bihPad(d.getMonth() + 1, 2) + '-' + bihPad(d.getDate(), 2);
}

// ── 데이터 찾기 (PO번호 기준) ────────────────────────────────────────────────
function bihFindOs(po) {
  const vs = (typeof osv3VendorsV3 !== 'undefined') ? osv3VendorsV3 : [];
  for (const v of vs) for (const x of (v.pos || [])) if (x.poNo === po) return { v, x };
  return null;
}
function bihFindMat(po) {
  const rows = (typeof getMaterialRows === 'function' ? getMaterialRows() : null) || [];
  return rows.find(r => r.poNo === po) || null;
}

// ── 검수 이력 만들기 (목업) ──────────────────────────────────────────────────
// 반환: { kind, title, sub, po, buy, plan: {월: 금액}, cases: [{ month, amount, ... AS-IS 칸 }] }
var BIH_NAMES = ['김*수', '이*진', '박*호', '최*영', '정*민', '강*우'];
function bihOsHistory(po) {
  const f = bihFindOs(po);
  if (!f) return null;
  const { v, x } = f;
  const months = Object.keys(x.plan || {}).sort();
  const plan = {}, planMm = {};
  months.forEach(m => { plan[m] = Number((x.plan[m] || {}).amount || 0); planMm[m] = Number((x.plan[m] || {}).mm || 0); });
  const grades = (x.quote && x.quote.grades && x.quote.grades.length) ? x.quote.grades : [{ grade: '고급', amount: 1 }];
  const gSum = grades.reduce((t, g) => t + (g.amount || 0), 0) || 1;
  let left = Number(x.actual || 0);
  const cases = [];
  const push = (m, inMonth, amt, mm, retro) => {
    let rest = amt, restMm = mm;
    grades.forEach((g, i) => {
      const last = i === grades.length - 1, share = (g.amount || 0) / gSum;
      const part = last ? rest : Math.round(amt * share / 1000) * 1000;
      const pmm = last ? Math.round(restMm * 100) / 100 : Math.round(mm * share * 100) / 100;
      rest -= part; restMm -= pmm;
      if (!part) return;
      const h = bihHash(po + m + i);
      cases.push({
        month: m, amount: part,
        slip: '88004' + bihPad(h % 100000, 5), name: BIH_NAMES[(h + i) % BIH_NAMES.length], grade: g.grade || '-',
        company: v.vendor, retro, inMonth, mm: pmm, date: bihAddDays(bihLastDay(m), -2),
      });
    });
  };
  months.forEach(m => {
    if (left <= 0) return;
    const amt = Math.min(plan[m] || 0, left);
    if (!amt) return;
    push(m, m, amt, plan[m] ? planMm[m] * amt / plan[m] : 0, '정상');
    left -= amt;
  });
  // 계획을 다 채우고도 남은 실적은 마지막 계획월 다음 달에 소급으로
  if (left > 0 && months.length) {
    const lm = months[months.length - 1], [y, mm] = lm.split('-').map(Number);
    const nm = mm === 12 ? (y + 1) + '-01' : y + '-' + bihPad(mm + 1, 2);
    push(nm, lm, left, 0, '소급');
  }
  return { kind: 'os', title: v.vendor, sub: x.contract || v.contract || '', po, buy: Number(x.amount || 0), plan, cases };
}
function bihMatHistory(po) {
  const r = bihFindMat(po);
  if (!r) return null;
  const plan = (typeof agentMatGoodsSpreadFinal === 'function') ? agentMatGoodsSpreadFinal(r) : {};
  const buy = Number(r.purchase || r.amount || 0);
  const item = r.productDetail || r.small || '';
  const vendor = r.vendor || r.manufacturer || '';
  const poDt = String(r.deliveryStart || '').slice(0, 10) || '2026-01-02';
  const prDt = bihAddDays(poDt, -10);
  const h0 = bihHash(po);
  const cases = (r.inspections || []).map((it, i) => {
    const h = bihHash(po + it.m + i);
    const gr = bihAddDays(bihLastDay(it.m), -5), amt = Number(it.amount || 0);
    return {
      month: it.m, amount: amt, kind: amt >= 0 ? '실적 발생' : '실적 차감', date: bihAddDays(gr, 3),
      apNo: '5105' + bihPad(h, 6), apDt: bihAddDays(gr, 3), apAmt: amt, apPay: bihAddDays(gr, 33),
      grNo: '5000' + bihPad((h * 7) % 1000000, 6), grDt: gr, grAmt: amt,
      poNo: po, poNm: item + ' 구매', poDt, vendor, poAmt: buy, buyer: '구매팀 담당자',
      prNo: '1000' + bihPad(h0, 6), prDt, prAmt: buy, requester: '프로젝트 PM',
    };
  });
  return {
    kind: 'mat', title: item,
    sub: [vendor, r.inspectCycle ? '검수 주기 ' + r.inspectCycle : ''].filter(Boolean).join(' · '),
    po, buy, plan, cases,
  };
}
function bihHistory() {
  const s = bihState;
  if (!s) return null;
  return s.kind === 'os' ? bihOsHistory(s.po) : bihMatHistory(s.po);
}

// ── 열기 · 닫기 · 전환 · 엑셀 ────────────────────────────────────────────────
function bihOpen(kind, po) {                            // crud R — 실적(검수) 금액 → 실적조회 팝업 열기
  bihState = { kind, po, view: (bihState && bihState.view) || 'month' };
  bihPaint();
}
function bihClose() {                                   // crud N — 실적조회 팝업 닫기
  bihState = null;
  const el = document.getElementById('bih-pop');
  if (el) el.remove();
}
function bihSetView(view) {                             // crud N — [월별 | 건별] 전환
  if (!bihState) return;
  bihState.view = view;
  bihPaint();
}
function bihExcel() {                                   // crud R — 지금 보는 표를 엑셀(.xlsx)로 다운로드
  const h = bihHistory();
  const t = document.querySelector('#bih-pop .bih-table');
  if (!h || !t || typeof bxeSave !== 'function') { if (typeof showToast === 'function') showToast('내려받을 표가 없습니다.'); return; }
  const acct = h.kind === 'os' ? '외주비' : '재료비';
  const view = bihState.view === 'month' ? '월별' : '건별';
  const today = typeof bxeToday === 'function' ? bxeToday() : '';
  bxeSave(`${acct}_실적조회_PO${h.po}_${view}_${today}.xlsx`, [bxeSheet(view,
    `${acct} 실적조회 — ${h.title} · PO ${h.po} (${view})`, '단위: 원 · 내려받은 날: ' + today, bxeTableRows(t))]);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && bihState) bihClose(); });

// ── 표 그리기 ────────────────────────────────────────────────────────────────
function bihMonthTable(h) {
  const byM = {};
  h.cases.forEach(c => { (byM[c.month] = byM[c.month] || { amt: 0, n: 0 }); byM[c.month].amt += c.amount; byM[c.month].n++; });
  const months = Array.from(new Set(Object.keys(h.plan).concat(Object.keys(byM)))).sort();
  let cum = 0, tPlan = 0, tAct = 0, tN = 0;
  const none = '<span class="bih-mute">–</span>';
  const rows = months.map(m => {
    const p = h.plan[m] || 0, got = byM[m], a = got ? got.amt : 0, n = got ? got.n : 0;
    cum += a; tPlan += p; tAct += a; tN += n;
    const diff = a - p;
    const diffTxt = !got ? '<span class="bih-mute">검수 전</span>'
      : diff === 0 ? '<span class="bih-mute">계획대로</span>'
      : `<span class="bih-diff">${diff > 0 ? '계획보다 많음' : '계획보다 적음'} ${bihWon(Math.abs(diff))}</span>`;
    return `<tr class="${got ? '' : 'bih-wait'}">
      <td><b>${bihEsc(m)}</b>${got && !p ? '<span class="bih-tag">계획에 없던 달</span>' : ''}</td>
      <td class="num">${p ? bihWon(p) : none}</td>
      <td class="num"><b>${got ? bihWon(a) : none}</b></td>
      <td>${diffTxt}</td>
      <td class="num">${got ? bihWon(cum) : none}</td>
      <td class="num">${n ? n + '건' : none}</td>
    </tr>`;
  }).join('');
  return `<table class="bih-table">
    <thead><tr><th>월</th><th class="num">계획 금액</th><th class="num">검수 금액</th><th>계획 대비</th><th class="num">누적 검수</th><th class="num">건수</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" class="bih-empty">검수 이력이 없습니다.</td></tr>'}</tbody>
    <tfoot><tr class="total"><td>합계</td><td class="num">${bihWon(tPlan)}</td><td class="num">${bihWon(tAct)}</td><td></td><td></td><td class="num">${tN}건</td></tr></tfoot>
  </table>`;
}
// 재료비 건별 — AS-IS MaterialCostAcrsPopup 재료비 탭 칸 그대로(2단 머리 · 왼쪽 4칸 고정)
function bihMatCaseTable(h) {
  const groups = [
    ['Account Payable Information', ['AP번호', 'AP Date', 'AP 금액', '예상지급일']],
    ['Goods Receipt Information', ['GR번호', 'GR Date', '검수금액']],
    ['Purchase Order Information', ['PO번호', 'PO명', 'PO Date', 'Vendor', 'PO 금액', '구매담당자']],
    ['Purchase Request Information', ['PR번호', 'PR Date', 'PR 금액', '요청자']],
  ];
  const fixed = ['번호', '구분', '실적발생일', '실적금액'];
  const money = new Set(['실적금액', 'AP 금액', '검수금액', 'PO 금액', 'PR 금액']);
  const nCols = fixed.length + groups.reduce((t, g) => t + g[1].length, 0);
  const sum = k => h.cases.reduce((t, c) => t + (c[k] || 0), 0);
  const fx = i => `bih-fx bih-fx${i}`;
  const rows = h.cases.map((c, i) => `<tr>
      <td class="${fx(0)} ctr">${i + 1}</td><td class="${fx(1)} ctr">${bihEsc(c.kind)}</td><td class="${fx(2)} ctr">${bihEsc(c.date)}</td>
      <td class="${fx(3)} num"><b>${bihNum(c.amount)}</b></td>
      <td class="ctr bih-code">${bihEsc(c.apNo)}</td><td class="ctr">${bihEsc(c.apDt)}</td><td class="num">${bihNum(c.apAmt)}</td><td class="ctr">${bihEsc(c.apPay)}</td>
      <td class="ctr bih-code">${bihEsc(c.grNo)}</td><td class="ctr">${bihEsc(c.grDt)}</td><td class="num">${bihNum(c.grAmt)}</td>
      <td class="ctr bih-code">${bihEsc(c.poNo)}</td><td>${bihEsc(c.poNm)}</td><td class="ctr">${bihEsc(c.poDt)}</td><td>${bihEsc(c.vendor)}</td>
      <td class="num">${bihNum(c.poAmt)}</td><td class="ctr">${bihEsc(c.buyer)}</td>
      <td class="bih-code">${bihEsc(c.prNo)}</td><td class="ctr">${bihEsc(c.prDt)}</td><td class="num">${bihNum(c.prAmt)}</td><td class="ctr">${bihEsc(c.requester)}</td>
    </tr>`).join('');
  return `<table class="bih-table bih-wide">
    <thead>
      <tr>${fixed.map((t, i) => `<th rowspan="2" class="${fx(i)} ctr">${t}</th>`).join('')}${groups.map(g => `<th colspan="${g[1].length}" class="ctr bih-grp">${g[0]}</th>`).join('')}</tr>
      <tr>${groups.map(g => g[1].map(t => `<th class="${money.has(t) ? 'num' : 'ctr'}">${t}</th>`).join('')).join('')}</tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="${nCols}" class="bih-empty">데이터가 없습니다.</td></tr>`}</tbody>
    <tfoot><tr class="total">
      <td colspan="3" class="${fx(0)} ctr">합계</td><td class="${fx(3)} num">${bihNum(sum('amount'))}</td>
      <td></td><td></td><td class="num">${bihNum(sum('apAmt'))}</td><td></td>
      <td></td><td></td><td class="num">${bihNum(sum('grAmt'))}</td>
      <td></td><td></td><td></td><td></td><td class="num">${h.cases.length ? bihNum(h.cases[0].poAmt) : 0}</td><td></td>
      <td></td><td></td><td class="num">${h.cases.length ? bihNum(h.cases[0].prAmt) : 0}</td><td></td>
    </tr></tfoot>
  </table>`;
}
// 외주비 건별 — AS-IS AcrsPopup 실투입외주비 탭 칸 그대로 + 실적발생월별 소계 줄
function bihOsCaseTable(h) {
  const head = ['NO', '실적발생월', '전표번호', '성명', '기술등급', '회사', '소급여부', '실제 투입월', '실투입 MM', '실투입 외주비', '발생일자'];
  const byM = [];
  h.cases.forEach(c => { let g = byM.find(x => x.m === c.month); if (!g) byM.push(g = { m: c.month, list: [] }); g.list.push(c); });
  let no = 0;
  const mm = n => (Math.round(n * 100) / 100).toFixed(2);
  const rows = byM.map(g => g.list.map(c => `<tr>
      <td class="ctr">${++no}</td><td class="ctr">${bihEsc(c.month)}</td><td class="ctr bih-code">${bihEsc(c.slip)}</td>
      <td class="ctr">${bihEsc(c.name)}</td><td class="ctr">${bihEsc(c.grade)}</td><td>${bihEsc(c.company)}</td>
      <td class="ctr">${bihEsc(c.retro)}</td><td class="ctr">${bihEsc(c.inMonth)}</td>
      <td class="num">${mm(c.mm)}</td><td class="num"><b>${bihNum(c.amount)}</b></td><td class="ctr">${bihEsc(c.date)}</td>
    </tr>`).join('') + `<tr class="bih-sub">
      <td class="ctr">소계</td><td class="ctr">${bihEsc(g.m)}</td><td colspan="6"></td>
      <td class="num">${mm(g.list.reduce((t, c) => t + c.mm, 0))}</td><td class="num">${bihNum(g.list.reduce((t, c) => t + c.amount, 0))}</td><td></td>
    </tr>`).join('');
  return `<table class="bih-table">
    <thead><tr>${head.map((t, i) => `<th class="${i >= 8 && i <= 9 ? 'num' : 'ctr'}">${t}</th>`).join('')}</tr></thead>
    <tbody>${rows || `<tr><td colspan="${head.length}" class="bih-empty">데이터가 없습니다.</td></tr>`}</tbody>
    <tfoot><tr class="total"><td colspan="8" class="ctr">합계 ${h.cases.length}건</td>
      <td class="num">${mm(h.cases.reduce((t, c) => t + c.mm, 0))}</td><td class="num">${bihNum(h.cases.reduce((t, c) => t + c.amount, 0))}</td><td></td></tr></tfoot>
  </table>`;
}

// ── 팝업 그리기 ──────────────────────────────────────────────────────────────
function bihPaint() {
  const h = bihHistory();
  let el = document.getElementById('bih-pop');
  if (!h) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'bih-pop'; document.body.appendChild(el); }
  const s = bihState;
  const act = h.cases.reduce((t, c) => t + c.amount, 0);
  const seg = (v, label) => `<button type="button" class="${s.view === v ? 'on' : ''}" aria-pressed="${s.view === v}" onclick="bihSetView('${v}')">${label}</button>`;
  const table = s.view === 'month' ? bihMonthTable(h) : (h.kind === 'mat' ? bihMatCaseTable(h) : bihOsCaseTable(h));
  el.innerHTML = `
    <div class="bih-dim" onclick="if(event.target===this)bihClose()">
      <div class="bih-pop" role="dialog" aria-modal="true" aria-label="${h.kind === 'os' ? '외주비' : '재료비'} 실적조회">
        <div class="bih-head">
          <div>
            <strong>${h.kind === 'os' ? '외주비' : '재료비'} 실적조회</strong>
            <span>${bihEsc(h.title)}${h.sub ? ' · ' + bihEsc(h.sub) : ''} · PO ${bihEsc(h.po)}</span>
          </div>
          <button class="bih-x" onclick="bihClose()" aria-label="닫기">✕</button>
        </div>
        <div class="bih-body">
          <div class="bih-sum">
            <div><span>구매 금액</span><b>${bihWon(h.buy)}</b></div>
            <div><span>검수 완료</span><b>${bihWon(act)}</b></div>
            <div><span>미검수</span><b>${bihWon(Math.max(h.buy - act, 0))}</b></div>
          </div>
          <div class="bih-bar">
            <div class="bih-seg" role="group" aria-label="보기 방식">${seg('month', '월별')}${seg('case', '건별')}</div>
            <span class="bih-hint">${s.view === 'month' ? '달마다 계획과 실제 검수 금액을 비교합니다.' : '검수 · 전표 건마다 봅니다(기존 프로미스 실적조회와 같은 칸).'}</span>
            <button type="button" class="bih-excel" onclick="bihExcel()">엑셀 다운로드</button>
          </div>
          <div class="bih-wrap">${table}</div>
          <p class="bih-note">검수 실적은 ERP에서 PO번호 기준으로 받아오며, 예산 버전을 다시 열면 그 사이 들어온 검수까지 반영됩니다.</p>
        </div>
        <div class="bih-foot"><button type="button" class="bih-close" onclick="bihClose()">닫기</button></div>
      </div>
    </div>`;
}

// ── 표의 실적(검수) 칸을 링크로 ───────────────────────────────────────────────
function bihLinkify(html, sel, kind) {
  if (typeof html !== 'string' || html.indexOf(sel.replace('table.', '')) < 0 || typeof document === 'undefined') return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const table = tpl.content.querySelector(sel);
  if (!table || !table.tBodies[0]) return html;
  const heads = Array.prototype.map.call(table.querySelectorAll('thead th'), th => th.textContent.trim());
  const iPo = heads.indexOf('PO번호'), iAct = heads.indexOf('실적(검수)');
  if (iPo < 0 || iAct < 0) return html;
  Array.prototype.forEach.call(table.tBodies[0].rows, tr => {
    if (tr.cells.length !== heads.length) return;            // 소계 · 입력 행 등은 건너뜀
    const m = (tr.cells[iPo].textContent || '').trim().match(/^(\d{8,10})/);
    const td = tr.cells[iAct];
    if (!m || !td || !/[1-9]/.test(td.textContent || '')) return;
    td.innerHTML = `<button type="button" class="bih-link" title="실적조회(검수 이력) 보기" onclick="event.stopPropagation();bihOpen('${kind}','${m[1]}')">${td.innerHTML}</button>`;
  });
  return tpl.innerHTML;
}
(function () {
  [['renderAgentOutsourceDetailFinal', 'table.agos-flat', 'os'], ['renderAgentMaterialDetailFinal', 'table.agmg', 'mat']].forEach(([name, sel, kind]) => {
    const before = window[name];
    if (typeof before !== 'function') return;
    window[name] = function () { return bihLinkify(before.apply(this, arguments), sel, kind); };
  });
})();

(function bihStyle() {
  if (typeof document === 'undefined' || document.getElementById('bih-style')) return;
  const st = document.createElement('style');
  st.id = 'bih-style';
  st.textContent = `
  .bih-link { padding:0; border:0; background:none; font:inherit; color:inherit; cursor:pointer;
    text-decoration:underline; text-decoration-color:#9aa3af; text-underline-offset:4px; }
  .bih-link:hover { color:#111827; text-decoration-color:#111827; }
  .bih-dim { position:fixed; inset:0; z-index:200; display:flex; align-items:center; justify-content:center; padding:24px;
    background:rgba(15,23,42,.38); }
  .bih-pop { width:min(1180px,100%); max-height:calc(100vh - 48px); display:flex; flex-direction:column; background:#fff;
    border-radius:14px; box-shadow:0 20px 50px rgba(15,23,42,.25); overflow:hidden; }
  .bih-head { display:flex; align-items:flex-start; gap:12px; padding:20px 24px 16px; border-bottom:1px solid #e5e7eb; }
  .bih-head strong { display:block; font-size:19px; font-weight:800; color:#111827; }
  .bih-head span { display:block; margin-top:5px; font-size:14.5px; color:#4b5563; }
  .bih-x { margin-left:auto; width:34px; height:34px; border:0; border-radius:8px; background:none; color:#4b5563; font-size:17px; cursor:pointer; }
  .bih-x:hover { background:#f1f3f6; }
  .bih-body { padding:18px 24px 6px; overflow:auto; min-height:0; }
  .bih-sum { display:grid; grid-template-columns:repeat(3,1fr); border:1px solid #e5e7eb; border-radius:10px; }
  .bih-sum > div { padding:14px 18px; }
  .bih-sum > div + div { border-left:1px solid #e5e7eb; }
  .bih-sum span { display:block; font-size:14px; color:#4b5563; }
  .bih-sum b { display:block; margin-top:4px; font-size:20px; font-weight:800; color:#111827; }
  .bih-bar { display:flex; align-items:center; gap:14px; margin:18px 0 10px; }
  .bih-seg { display:inline-flex; gap:2px; padding:3px; border-radius:9px; background:#eceef2; }
  .bih-seg > button { height:32px; padding:0 18px; border:0; border-radius:7px; background:transparent; color:#4b5563;
    font-size:14.5px; font-weight:600; cursor:pointer; }
  .bih-seg > button.on { background:#fff; color:#111827; font-weight:800; box-shadow:0 1px 2px rgba(15,23,42,.14); }
  .bih-hint { font-size:13.5px; color:#4b5563; }
  .bih-excel { margin-left:auto; height:34px; padding:0 14px; border:1px solid #cbd5e1; border-radius:8px; background:#fff;
    color:#1c2432; font-size:14px; font-weight:600; cursor:pointer; }
  .bih-excel:hover { background:#f8fafc; border-color:#94a3b8; }
  .bih-wrap { overflow:auto; max-height:52vh; border:1px solid #e5e7eb; border-radius:10px; }
  .bih-table { width:100%; border-collapse:separate; border-spacing:0; font-size:14.5px; color:#1c2432; }
  .bih-table th { position:sticky; top:0; z-index:1; padding:11px 14px; background:#f6f7f9; color:#374151; font-size:13.5px; font-weight:700;
    text-align:left; white-space:nowrap; border-bottom:1px solid #e5e7eb; }
  .bih-table thead tr + tr th { top:41px; }
  .bih-table th.bih-grp { border-bottom:1px solid #e5e7eb; border-left:1px solid #e5e7eb; }
  .bih-table td { padding:12px 14px; border-bottom:1px solid #eef0f3; white-space:nowrap; background:#fff; }
  .bih-table .num { text-align:right; }
  .bih-table .ctr { text-align:center; }
  /* 공통 CSS의 tbody td 노란 줄(border-color:#ffedd5 !important)을 이 팝업 표에서만 회색으로 */
  .bih-table td { border-color:#eef0f3 !important; }
  .bih-table tbody tr:last-child td { border-bottom:0; }
  .bih-table tfoot td { position:sticky; bottom:0; padding:12px 14px; background:#f6f7f9; border-top:1px solid #d5dae1; font-weight:800; color:#111827; }
  .bih-table tr.bih-sub td { background:#f6f7f9; font-weight:700; color:#111827; }
  .bih-table tr.bih-wait td { color:#6b7280; }
  /* 재료비 건별 — 왼쪽 4칸 고정(AS-IS와 같음) */
  .bih-wide { width:max-content; min-width:100%; }
  .bih-table .bih-fx { position:sticky; z-index:2; }
  .bih-table th.bih-fx { z-index:3; }
  .bih-table .bih-fx0 { left:0; min-width:56px; } .bih-table .bih-fx1 { left:56px; min-width:92px; }
  .bih-table .bih-fx2 { left:148px; min-width:112px; } .bih-table .bih-fx3 { left:260px; min-width:120px; border-right:1px solid #d5dae1; }
  .bih-code { font-variant-numeric:tabular-nums; color:#374151; }
  .bih-mute { color:#9aa3af; }
  .bih-diff { color:#b42318; font-weight:600; }
  .bih-tag { margin-left:8px; padding:2px 7px; border-radius:5px; background:#fdecea; color:#b42318; font-size:12.5px; font-weight:700; }
  .bih-empty { padding:28px 14px !important; text-align:center; color:#6b7280; }
  .bih-note { margin:12px 2px 10px; font-size:13.5px; color:#4b5563; }
  .bih-foot { display:flex; justify-content:flex-end; padding:12px 24px 18px; border-top:1px solid #eef0f3; }
  .bih-close { height:38px; padding:0 22px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:#1c2432;
    font-size:14.5px; font-weight:700; cursor:pointer; }
  .bih-close:hover { background:#f8fafc; }`;
  document.head.appendChild(st);
})();
