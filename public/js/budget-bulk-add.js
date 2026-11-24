// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 — 재료비 엑셀 일괄 등록 · 경비 계정 추가(즐겨찾기) · 리스회계처리 대상 안내   작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 원가조정 계정 상세에서 "여러 건을 한 번에 넣는" 기능을 모은 전용 파일입니다. (2026.11.24)
//
//  ① 재료비 > 상품재료비 [엑셀 업로드]  (AS-IS: 재료비 엑셀 양식 업로드 uploadExcel)
//     - [양식 다운로드] → 품목을 한 줄에 하나씩 적어 [파일 선택] → 팝업에서 행마다 확인 → [등록]
//     - AS-IS는 필수값이 빠진 행을 말없이 건너뛰었지만, 여기서는 "확인 필요" 행과 이유를 보여 주고 그 행만 빼고 등록합니다.
//     - 등록하면 상품재료비 목록에 한 번에 들어가고, [예산 조정안]에 ✎ 수기 입력 1건(엑셀 일괄 등록)으로 올라갑니다.
//     - .xlsx 는 외부 라이브러리 없이 브라우저에서 읽습니다(ZIP + DecompressionStream). 목업 시연용 [예시 데이터로 보기] 제공.
//
//  ② 경비 [＋ 경비 편성] → "경비 계정 추가" 팝업  (AS-IS: 경비계정 추가 팝업 Account.vue)
//     - 경비 계정이 많아 드롭다운 대신 팝업 목록(검색 · ★즐겨찾기 · 체크)으로 고릅니다.
//     - [즐겨찾기 계정 일괄 추가] / [선택 계정 추가] → 고른 계정마다 표 맨 위에 월 입력 행이 생기고, 표 위 [저장]으로 반영합니다.
//     - 이미 편성된 계정 · 입력 중인 계정은 고를 수 없습니다(AS-IS: 이미 추가된 계정 비활성).
//     - 즐겨찾기는 이 브라우저에만 기억합니다(목업 — 실서비스는 사용자별 즐겨찾기 저장 API, AS-IS bmJsn).
//
//  ③ 리스회계처리 대상 안내 팝업  (AS-IS: LeaseAccountingInfo.vue)
//     - 추가한 계정 중 리스 확인 대상 7개 계정(706901 · 711101 · 706904 · 711150 · 625105 · 720150 · 726301)이
//       있으면 안내만 띄웁니다. 저장 · 결재를 막지 않고, 결과를 저장하지도 않습니다(AS-IS와 같음).
//
//  공유 파일은 고치지 않습니다. budget-inline-edit.js · budget-excel-export.js 뒤에 로드합니다.
// ═══════════════════════════════════════════════════════════════════════════

/* ── 공통: 팝업 열고 닫기 ─────────────────────────────────────────────── */
function bbaOpen(html, wide) {
  bbaClose();
  const dim = document.createElement('div');
  dim.id = 'bba-dim';
  dim.className = 'bba-dim';
  dim.setAttribute('onclick', 'if(event.target===this)bbaClose()');
  dim.innerHTML = '<div class="bba-pop' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' + html + '</div>';
  document.body.appendChild(dim);
}
function bbaClose() {
  const d = document.getElementById('bba-dim');
  if (d) d.remove();
}
function bbaEsc(s) { return (typeof escHtml === 'function') ? escHtml(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function bbaFmt(n) { return (typeof fmt === 'function') ? fmt(n) : Number(n || 0).toLocaleString('ko-KR'); }
function bbaToast(m) { if (typeof showToast === 'function') showToast(m); }
if (typeof document !== 'undefined') document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && document.getElementById('bba-dim')) bbaClose();
});

/* ═══ ① 재료비 > 상품재료비 엑셀 업로드 ═══════════════════════════════════ */
// 양식 열 — 화면의 [＋ 품목 등록] 입력칸과 같은 순서 · 이름
var BBA_MAT_COLS = [
  { key: 'name',  head: '품목명',      req: true },
  { key: 'large', head: '대분류' },
  { key: 'middle', head: '중분류' },
  { key: 'model', head: '모델' },
  { key: 'qty',   head: '수량',        req: true },
  { key: 'unit',  head: '단위' },
  { key: 'price', head: '단가(원)' },
  { key: 'amount', head: '금액(원)',   req: true },
  { key: 'start', head: '납품 시작일', req: true },
  { key: 'end',   head: '납품 종료일', req: true },
];
var BBA_MAT = { rows: [], file: '' };

function bbaMatOpen() {
  BBA_MAT = { rows: [], file: '' };
  bbaMatRender();
}
function bbaMatRender() {
  const rows = BBA_MAT.rows;
  const ok = rows.filter(function (r) { return !r.err; });
  const bad = rows.length - ok.length;
  const tot = ok.reduce(function (t, r) { return t + r.amount; }, 0);
  const table = rows.length ? `
    <div class="bba-sum">
      <span>${bbaEsc(BBA_MAT.file)}</span>
      <b>등록 가능 ${ok.length}건 · ${bbaFmt(tot)}원</b>
      ${bad ? `<em>확인 필요 ${bad}건 — 이 행은 등록되지 않습니다</em>` : ''}
    </div>
    <div class="bba-tbl-wrap">
      <table class="bba-tbl">
        <thead><tr><th class="c">엑셀 행</th><th>품목명</th><th>분류</th><th>모델</th><th class="n">수량</th><th>납품기간</th><th class="n">금액</th><th>확인</th></tr></thead>
        <tbody>${rows.map(function (r) { return `
          <tr class="${r.err ? 'bad' : ''}">
            <td class="c">${r.line}</td>
            <td><b>${bbaEsc(r.name || '–')}</b></td>
            <td>${bbaEsc([r.large, r.middle].filter(Boolean).join(' · ') || '–')}</td>
            <td>${bbaEsc(r.model || '–')}</td>
            <td class="n">${r.qty || '–'}${bbaEsc(r.qty ? r.unit : '')}</td>
            <td>${bbaEsc(r.start || '?')} ~ ${bbaEsc(r.end || '?')}</td>
            <td class="n">${r.amount ? bbaFmt(r.amount) + '원' : '–'}</td>
            <td>${r.err ? `<span class="bba-st bad">${bbaEsc(r.err)}</span>` : '<span class="bba-st ok">등록 가능</span>'}</td>
          </tr>`; }).join('')}</tbody>
      </table>
    </div>` : `
    <div class="bba-empty">
      <b>아직 올린 파일이 없습니다</b>
      <span>양식을 내려받아 품목을 한 줄에 하나씩 적은 뒤 [파일 선택]으로 올려 주세요.</span>
    </div>`;
  bbaOpen(`
    <div class="bba-head">
      <div><strong>상품재료비 엑셀 업로드</strong>
        <span>여러 품목을 엑셀로 한 번에 등록합니다. 올린 내용을 아래에서 확인한 뒤 [등록]을 누르세요.</span></div>
      <button class="bba-x" onclick="bbaClose()" title="닫기">✕</button>
    </div>
    <div class="bba-body">
      <ol class="bba-steps">
        <li><b>1</b><span>양식 받기</span><button class="bba-btn" onclick="bbaMatTemplate()">⬇ 양식 다운로드</button></li>
        <li><b>2</b><span>품목 적기</span><em>한 줄에 품목 하나 · <i>*</i> 표시는 꼭 채우기</em></li>
        <li><b>3</b><span>파일 올리기</span>
          <label class="bba-btn pri">파일 선택<input type="file" accept=".xlsx" onchange="bbaMatFile(this)" hidden></label>
          <button class="bba-link" onclick="bbaMatSample()">예시 데이터로 보기</button></li>
      </ol>
      ${table}
      <p class="bba-note">금액이 비어 있으면 단가 × 수량으로 계산합니다. 금액은 납품 기간에 고르게 나눠 상품재료비 월별 계획에 반영됩니다.</p>
    </div>
    <div class="bba-foot">
      <button class="bba-cancel" onclick="bbaClose()">닫기</button>
      <button class="bba-ok" onclick="bbaMatRegister()" ${ok.length ? '' : 'disabled'}>등록${ok.length ? ` (${ok.length}건)` : ''}</button>
    </div>`, true);
}

// 양식 다운로드 — 1행 제목 · 2행 안내 · 3행 머리(필수 *)
function bbaMatTemplate() {
  if (typeof bxeSave !== 'function') { bbaToast('엑셀 모듈을 불러오지 못했습니다.'); return; }
  const head = BBA_MAT_COLS.map(function (c) { return { v: c.head + (c.req ? ' *' : ''), s: 'head' }; });
  bxeSave('상품재료비_업로드양식.xlsx', [{
    name: '상품재료비',
    rows: [
      [{ v: '상품재료비 업로드 양식', s: 'title' }],
      [{ v: '* 는 꼭 채우세요 · 날짜는 2026-09-01 형식 · 금액이 비어 있으면 단가 × 수량으로 계산 · 4행부터 한 줄에 품목 하나', s: 'note' }],
      head,
    ],
    freeze: 3,
  }]);
}

// 파일 선택 → 읽기 → 확인
function bbaMatFile(input) {
  const f = input && input.files && input.files[0];
  if (!f) return;
  if (!/\.xlsx$/i.test(f.name)) { bbaToast('.xlsx 파일만 올릴 수 있습니다.'); return; }
  bbaReadXlsx(f).then(function (grid) {
    const rows = bbaMatParse(grid);
    if (rows === null) { bbaToast('양식의 머리 줄(품목명 · 수량 · 금액 …)을 찾지 못했습니다. [양식 다운로드]로 받은 파일에 적어 주세요.'); return; }
    if (!rows.length) { bbaToast('적힌 품목이 없습니다.'); return; }
    BBA_MAT = { rows: rows, file: f.name };
    bbaMatRender();
  }).catch(function () {
    bbaToast('파일을 읽지 못했습니다. 엑셀에서 .xlsx 로 다시 저장해 올려 주세요.');
  });
}
// 목업 시연용 — 정상 4건 + 확인 필요 2건
function bbaMatSample() {
  const H = BBA_MAT_COLS.map(function (c) { return c.head + (c.req ? ' *' : ''); });
  const grid = [['상품재료비 업로드 양식'], ['안내'], H,
    ['APM 모니터링 라이선스', '솔루션', '라이선스', 'APM-ENT-26', 2, '식', 6500000, '', '2026-10-01', '2027-09-30'],
    ['백업 스토리지', 'HW', '스토리지', 'BK-ST-40T', 1, 'EA', '', 18400000, '2026-11-01', '2026-11-30'],
    ['보안 취약점 점검 도구', '솔루션', '보안', 'SEC-SCAN-P', 1, '식', '', 7200000, '2026-12-01', '2027-11-30'],
    ['개발용 노트북', 'HW', 'PC', 'NB-DEV-16', 4, 'EA', 2100000, '', '2026-10-15', '2026-10-31'],
    ['DB 암호화 모듈', '솔루션', '보안', 'DB-ENC-01', 1, '식', '', 9800000, '2026-11-01', ''],
    ['', 'HW', '네트워크', 'L3-SW-48', 2, 'EA', 3300000, '', '2026-12-01', '2026-12-31'],
  ];
  BBA_MAT = { rows: bbaMatParse(grid), file: '예시 데이터 (목업)' };
  bbaMatRender();
}
// 표(2차원 배열) → 확인된 행. 머리 줄을 못 찾으면 null
function bbaMatParse(grid) {
  const norm = function (s) { return String(s == null ? '' : s).replace(/[\s*]/g, ''); };
  let hr = -1;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    if ((grid[i] || []).some(function (v) { return norm(v) === '품목명'; })) { hr = i; break; }
  }
  if (hr < 0) return null;
  const idx = {};
  (grid[hr] || []).forEach(function (v, c) {
    const col = BBA_MAT_COLS.find(function (x) { return norm(x.head) === norm(v) || norm(x.head).replace(/\(원\)/, '') === norm(v); });
    if (col) idx[col.key] = c;
  });
  const out = [];
  for (let i = hr + 1; i < grid.length; i++) {
    const g = grid[i] || [];
    const cell = function (k) { return idx[k] == null ? '' : g[idx[k]]; };
    const txt = function (k) { return String(cell(k) == null ? '' : cell(k)).trim(); };
    if (!BBA_MAT_COLS.some(function (c) { return txt(c.key) !== ''; })) continue;     // 빈 줄
    const num = function (k) { const v = cell(k); if (typeof v === 'number') return v; return Number(String(v || '').replace(/[^\d.\-]/g, '')) || 0; };
    const r = {
      line: i + 1, name: txt('name'), large: txt('large'), middle: txt('middle'), model: txt('model'),
      qty: Math.max(Math.round(num('qty')), 0), unit: txt('unit') || '식', price: Math.abs(num('price')),
      start: bbaDate(cell('start')), end: bbaDate(cell('end')),
    };
    r.amount = Math.abs(num('amount')) || (r.price && r.qty ? r.price * r.qty : 0);
    const miss = [];
    if (!r.name) miss.push('품목명');
    if (!r.qty) miss.push('수량');
    if (!r.amount) miss.push('금액');
    if (!r.start) miss.push('납품 시작일');
    if (!r.end) miss.push('납품 종료일');
    r.err = miss.length ? miss.join(' · ') + ' 없음'
      : (r.end < r.start ? '종료일이 시작일보다 앞섬' : '');
    out.push(r);
  }
  return out;
}
// 엑셀 날짜(일련번호) · 2026.9.1 · 2026/09/01 → 2026-09-01
function bbaDate(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
  }
  const m = /^(\d{4})[.\-\/년\s]+(\d{1,2})[.\-\/월\s]+(\d{1,2})/.exec(String(v).trim());
  if (!m) return '';
  const p = function (n) { return ('0' + n).slice(-2); };
  const s = m[1] + '-' + p(m[2]) + '-' + p(m[3]);
  return isNaN(new Date(s).getTime()) ? '' : s;
}
// [등록] — 확인된 행만 상품재료비 목록에 넣고, 예산 조정안에 수기 입력 1건으로 올립니다
function bbaMatRegister() {
  const ok = BBA_MAT.rows.filter(function (r) { return !r.err; });
  if (!ok.length) { bbaToast('등록할 행이 없습니다.'); return; }
  if (typeof agentMatListFinal !== 'function') { bbaToast('재료비 화면을 불러오지 못했습니다.'); return; }
  const name = (agentMatSubNamesFinal()[0]) || '상품재료비';
  const list = agentMatListFinal('goods', name);
  const seq = Date.now();
  const added = ok.map(function (r, i) {
    return { id: 'mi-x' + seq + '-' + i, productDetail: r.name, small: r.name, large: r.large, middle: r.middle, model: r.model,
      quantity: r.qty, unit: r.unit, deliveryStart: r.start, deliveryEnd: r.end, amount: r.amount,
      quoteNo: '', revenueBasis: '월', status: '계획', actualized: false };
  });
  added.forEach(function (p) {
    list.unshift(p);
    agentMatDeltaAddFinal('goods', name, null, p);
  });
  const tot = added.reduce(function (t, p) { return t + p.amount; }, 0);
  agentHandRecordFinal('재료비', '상품재료비', `엑셀 일괄 등록 · 상품재료비 ${added.length}건 ${bbaFmt(tot)}원`,
    agentMatMonthsFinal('goods', added), added);
  bbaClose();
  agentHandToastFinal(`상품재료비 ${added.length}건(${bbaFmt(tot)}원)을 엑셀로 등록했습니다`);
  renderBudgetPage();
}

/* ── .xlsx 읽기(외부 라이브러리 없음) → 첫 시트를 2차원 배열로 ──────────── */
function bbaReadXlsx(file) {
  return file.arrayBuffer().then(function (ab) {
    const buf = new Uint8Array(ab);
    const dv = new DataView(ab);
    let e = buf.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('zip');
    const cnt = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const files = {};
    const td = new TextDecoder();
    for (let i = 0; i < cnt; i++) {
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
      files[td.decode(buf.subarray(p + 46, p + 46 + nlen))] = { method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) };
      p += 46 + nlen + xlen + clen;
    }
    const get = function (name) {
      const f = files[name];
      if (!f) return Promise.resolve('');
      const s = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
      const data = buf.subarray(s, s + f.size);
      if (f.method === 0) return Promise.resolve(td.decode(data));
      const ds = new DecompressionStream('deflate-raw');
      return new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer().then(function (b) { return td.decode(b); });
    };
    const sheet = Object.keys(files).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); })
      .sort(function (a, b) { return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10); })[0];
    if (!sheet) throw new Error('sheet');
    return Promise.all([get('xl/sharedStrings.xml'), get(sheet)]);
  }).then(function (xs) {
    const dp = new DOMParser();
    const textOf = function (el) { return Array.prototype.map.call(el.getElementsByTagName('t'), function (t) { return t.textContent; }).join(''); };
    const ss = xs[0] ? Array.prototype.map.call(dp.parseFromString(xs[0], 'application/xml').getElementsByTagName('si'), textOf) : [];
    const doc = dp.parseFromString(xs[1], 'application/xml');
    const grid = [];
    Array.prototype.forEach.call(doc.getElementsByTagName('row'), function (row, ri) {
      const r = (parseInt(row.getAttribute('r'), 10) || ri + 1) - 1;
      const line = grid[r] = grid[r] || [];
      Array.prototype.forEach.call(row.getElementsByTagName('c'), function (c, ci) {
        const ref = c.getAttribute('r') || '';
        const letters = (/^[A-Z]+/.exec(ref) || [''])[0];
        const col = letters ? letters.split('').reduce(function (t, ch) { return t * 26 + ch.charCodeAt(0) - 64; }, 0) - 1 : ci;
        const t = c.getAttribute('t');
        const vEl = c.getElementsByTagName('v')[0];
        const v = vEl ? vEl.textContent : '';
        let val;
        if (t === 's') val = ss[parseInt(v, 10)] || '';
        else if (t === 'inlineStr') val = textOf(c);
        else if (t === 'str' || t === 'b' || t === 'e') val = v;
        else val = v === '' ? '' : Number(v);
        line[col] = val;
      });
    });
    for (let i = 0; i < grid.length; i++) grid[i] = grid[i] || [];
    return grid;
  });
}

/* ═══ ② 경비 계정 추가 팝업(즐겨찾기 · 일괄 추가) ═══════════════════════ */
// 리스회계처리 대상 확인 계정(AS-IS BodyContent.vue:closeAccountPopup 와 같은 7개)
var BBA_LEASE_CODES = ['706901', '711101', '706904', '711150', '625105', '720150', '726301'];
// 경비 계정 목록 = 지금 프로젝트에 있는 세부계정 + 아래 추가 계정(계정번호 · 이름은 AS-IS 기준, 중분류 배정은 목업)
var BBA_EXP_MORE = [
  { code: '705904', name: '석식대',            mid: '조직운영비' },
  { code: '723103', name: '캔미팅',            mid: '조직운영비' },
  { code: '706201', name: '시내교통비',        mid: '일반통제성' },
  { code: '706903', name: '자가차량지원비',    mid: '일반통제성' },
  { code: '706901', name: '승용차량비',        mid: '일반통제성' },
  { code: '710401', name: '인쇄및제본비',      mid: '소모품비' },
  { code: '725916', name: '세미나개최비',      mid: '교육훈련비' },
  { code: '720150', name: '기타광고선전비',    mid: '일반비' },
  { code: '726301', name: '지급수수료',        mid: '일반비통제성' },
  { code: '711101', name: '사무실임차료',      mid: '일반비통제성' },
  { code: '706904', name: '현지숙소임차관리비', mid: '일반비통제성' },
  { code: '711150', name: '기타임차료',        mid: '일반비통제성' },
  { code: '625105', name: 'HW 사용료(임차료)', mid: '일반비통제성' },
];
var BBA_FAV_KEY = 'bba-exp-fav';
var BBA_FAV_DEFAULT = ['705501', '735901', '705904', '706201', '725916'];   // 목업 첫 즐겨찾기(의욕관리비 · 회의비 · 석식대 · 시내교통비 · 세미나개최비)
var BBA_EXP = { q: '', view: 'all', sel: {} };

function bbaFavGet() {
  try { const s = localStorage.getItem(BBA_FAV_KEY); if (s) return JSON.parse(s) || []; } catch (e) {}
  return BBA_FAV_DEFAULT.slice();
}
function bbaFavSet(list) {
  BBA_FAV_MEM = list;
  try { localStorage.setItem(BBA_FAV_KEY, JSON.stringify(list)); } catch (e) {}
}
var BBA_FAV_MEM = null;
function bbaFavs() { if (!BBA_FAV_MEM) BBA_FAV_MEM = bbaFavGet(); return BBA_FAV_MEM; }

function bbaExpRows() { return (typeof EXPENSE_ACCOUNT_ROWS_FINAL !== 'undefined') ? EXPENSE_ACCOUNT_ROWS_FINAL : []; }
function bbaExpMids() { return (typeof EXPENSE_MIDDLE_ACCOUNTS_FINAL !== 'undefined') ? EXPENSE_MIDDLE_ACCOUNTS_FINAL : []; }
function bbaExpFlow() {
  return (typeof BIE_FLOWS !== 'undefined') ? BIE_FLOWS.find(function (f) { return f.open === 'agentExpEdOpenFinal'; }) : null;
}
// 계정 목록 + 상태(편성됨 · 입력 중 · 고를 수 있음)
function bbaExpMaster() {
  const rows = bbaExpRows();
  const seen = {};
  const list = [];
  rows.forEach(function (r) {
    if (seen[r.code]) return;
    seen[r.code] = 1;
    list.push({ code: r.code, name: r.name, mid: r.middleName, controlled: !!r.controlled, row: r });
  });
  BBA_EXP_MORE.forEach(function (m) {
    if (seen[m.code]) return;
    seen[m.code] = 1;
    const mid = bbaExpMids().find(function (x) { return x.name === m.mid; }) || {};
    list.push({ code: m.code, name: m.name, mid: m.mid, controlled: mid.control === '통제', row: null });
  });
  const drafting = {};
  if (typeof BIE_DRAFTS !== 'undefined') BIE_DRAFTS.forEach(function (d) {
    if (d.state && d.state.id && d.flow && d.flow.open === 'agentExpEdOpenFinal') drafting[d.state.id] = 1;
  });
  const favs = bbaFavs();
  list.forEach(function (a) {
    const planned = a.row && ((a.row.monthly || []).some(function (v) { return Number(v || 0) > 0; }) || Number(a.row.actual || 0) > 0);
    a.state = planned ? 'done' : (a.row && drafting[a.row.id]) ? 'draft' : 'free';
    a.fav = favs.indexOf(a.code) >= 0;
    a.lease = BBA_LEASE_CODES.indexOf(a.code) >= 0;
  });
  // 즐겨찾기 먼저, 그다음 계정번호 순
  return list.sort(function (x, y) { return (y.fav - x.fav) || String(x.code).localeCompare(String(y.code)); });
}

function bbaExpOpen() {
  BBA_EXP = { q: '', view: 'all', sel: {} };
  bbaExpRender();
}
function bbaExpRender(keepFocus) {
  const all = bbaExpMaster();
  const q = BBA_EXP.q.trim().toLowerCase();
  const shown = all.filter(function (a) {
    if (BBA_EXP.view === 'fav' && !a.fav) return false;
    return !q || (a.name + ' ' + a.code + ' ' + a.mid).toLowerCase().indexOf(q) >= 0;
  });
  const favN = all.filter(function (a) { return a.fav; }).length;
  const favFree = all.filter(function (a) { return a.fav && a.state === 'free'; }).length;
  const selN = Object.keys(BBA_EXP.sel).filter(function (k) { return BBA_EXP.sel[k]; }).length;
  const tag = { done: '<span class="bba-st">편성됨</span>', draft: '<span class="bba-st draft">입력 중</span>', free: '' };
  bbaOpen(`
    <div class="bba-head">
      <div><strong>경비 계정 추가</strong>
        <span>편성할 계정을 고르세요. 고른 계정은 표 맨 위에 입력 행으로 추가되고, 월별 금액을 넣은 뒤 [저장]하면 반영됩니다.</span></div>
      <button class="bba-x" onclick="bbaClose()" title="닫기">✕</button>
    </div>
    <div class="bba-body">
      <div class="bba-tools">
        <input id="bba-exp-q" class="bba-search" placeholder="계정명 또는 계정번호로 검색" value="${bbaEsc(BBA_EXP.q)}" oninput="bbaExpSearch(this.value)">
        <div class="bba-seg">
          <button class="${BBA_EXP.view === 'all' ? 'on' : ''}" onclick="bbaExpView('all')">전체 ${all.length}</button>
          <button class="${BBA_EXP.view === 'fav' ? 'on' : ''}" onclick="bbaExpView('fav')">★ 즐겨찾기 ${favN}</button>
        </div>
      </div>
      <div class="bba-tbl-wrap tall">
        <table class="bba-tbl pick">
          <thead><tr><th class="c">선택</th><th class="c">즐겨찾기</th><th>계정번호</th><th>계정명</th><th>중분류</th><th>상태</th></tr></thead>
          <tbody>${shown.length ? shown.map(function (a) {
            const free = a.state === 'free';
            return `
            <tr class="${free ? '' : 'off'} ${BBA_EXP.sel[a.code] ? 'on' : ''}" ${free ? `onclick="bbaExpToggle('${a.code}')"` : ''}>
              <td class="c"><input type="checkbox" ${BBA_EXP.sel[a.code] ? 'checked' : ''} ${free ? '' : 'disabled'} onclick="event.stopPropagation();bbaExpToggle('${a.code}')"></td>
              <td class="c"><button class="bba-star ${a.fav ? 'on' : ''}" title="${a.fav ? '즐겨찾기 해제' : '즐겨찾기에 넣기'}" onclick="event.stopPropagation();bbaExpFav('${a.code}')">${a.fav ? '★' : '☆'}</button></td>
              <td class="code">${bbaEsc(a.code)}</td>
              <td><b>${bbaEsc(a.name)}</b>${a.lease ? '<i class="bba-lease" title="추가하면 리스회계처리 대상인지 확인 안내가 나옵니다">리스 확인</i>' : ''}</td>
              <td>${bbaEsc(a.mid)}<span class="bba-ctl">${a.controlled ? '통제' : '비통제'}</span></td>
              <td>${tag[a.state]}</td>
            </tr>`; }).join('') : `<tr><td colspan="6" class="bba-none">${BBA_EXP.view === 'fav' && !favN ? '즐겨찾기한 계정이 없습니다. 목록에서 ☆를 눌러 넣어 두세요.' : '찾는 계정이 없습니다.'}</td></tr>`}</tbody>
        </table>
      </div>
      <p class="bba-note">☆를 눌러 자주 쓰는 계정을 즐겨찾기에 넣어 두면, 다음부터 [즐겨찾기 계정 일괄 추가]로 한 번에 넣을 수 있습니다. 이미 편성된 계정은 표에서 [수정]으로 고치세요.</p>
    </div>
    <div class="bba-foot">
      <span class="bba-cnt">${selN ? `<b>${selN}개</b> 선택` : '선택한 계정 없음'}</span>
      <button class="bba-cancel" onclick="bbaClose()">닫기</button>
      <button class="bba-sub" onclick="bbaExpAddFav()" ${favFree ? '' : 'disabled'} title="즐겨찾기 중 아직 편성하지 않은 계정을 모두 추가합니다">★ 즐겨찾기 계정 일괄 추가${favFree ? ` (${favFree})` : ''}</button>
      <button class="bba-ok" onclick="bbaExpAddSel()" ${selN ? '' : 'disabled'}>선택 계정 추가${selN ? ` (${selN})` : ''}</button>
    </div>`, true);
  if (keepFocus) {
    const el = document.getElementById('bba-exp-q');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }
}
function bbaExpSearch(v) { BBA_EXP.q = v || ''; bbaExpRender(true); }
function bbaExpView(v) { BBA_EXP.view = v; bbaExpRender(); }
function bbaExpToggle(code) { BBA_EXP.sel[code] = !BBA_EXP.sel[code]; bbaExpRender(); }
function bbaExpFav(code) {
  const f = bbaFavs().slice();
  const i = f.indexOf(code);
  if (i >= 0) f.splice(i, 1); else f.push(code);
  bbaFavSet(f);
  bbaExpRender();
}
function bbaExpAddFav() {
  const codes = bbaExpMaster().filter(function (a) { return a.fav && a.state === 'free'; }).map(function (a) { return a.code; });
  if (!codes.length) { bbaToast('추가할 즐겨찾기 계정이 없습니다(모두 편성됐거나 입력 중).'); return; }
  bbaExpAdd(codes);
}
function bbaExpAddSel() {
  const codes = Object.keys(BBA_EXP.sel).filter(function (k) { return BBA_EXP.sel[k]; });
  if (!codes.length) { bbaToast('추가할 계정을 골라 주세요.'); return; }
  bbaExpAdd(codes);
}
// 고른 계정마다 세부계정 행을 준비하고(없으면 0원으로 만듦) 표 맨 위에 월 입력 행을 엽니다
function bbaExpAdd(codes) {
  const F = bbaExpFlow();
  if (!F || typeof BIE_DRAFTS === 'undefined') { bbaToast('경비 입력 행을 열 수 없습니다.'); return; }
  const master = bbaExpMaster();
  const rows = bbaExpRows();
  const n = (typeof EXPENSE_PLAN_MONTHS !== 'undefined') ? EXPENSE_PLAN_MONTHS.length : 0;
  const ctx = (typeof bieCtx === 'function') ? bieCtx() : '';
  const ids = [];
  const lease = [];
  if (typeof bieCapture === 'function') bieCapture();
  codes.forEach(function (code) {
    const a = master.find(function (x) { return x.code === code; });
    if (!a || a.state !== 'free') return;
    let row = a.row;
    if (!row) {
      const mid = bbaExpMids().find(function (x) { return x.name === a.mid; }) || {};
      row = { id: 'exf-a' + code, middleCode: mid.code || '', middleName: a.mid, controlled: a.controlled, code: a.code, name: a.name,
        carried: 0, actual: 0, erpAvailable: a.controlled ? 0 : null, monthly: new Array(n).fill(0) };
      rows.push(row);
    }
    const d = { id: 'd' + (++bieDraftSeq), flow: F, state: { id: row.id }, isNew: true, values: null, err: false, ctx: ctx };
    BIE_DRAFTS.push(d);
    ids.push(d.id);
    if (a.lease) lease.push(a.code);
  });
  bbaClose();
  if (!ids.length) { bbaToast('추가할 수 있는 계정이 없습니다.'); return; }
  renderBudgetPage();
  if (typeof bieFocusRow === 'function') bieFocusRow(ids[ids.length - 1]);
  bbaToast(`${ids.length}개 계정을 표 맨 위에 추가했습니다. 월별 금액을 넣고 표 위 [저장]을 누르세요.`);
  if (lease.length) bbaLeaseOpen(lease);
}

// [＋ 경비 편성] → 계정 추가 팝업 / 기존 행 [수정] 은 원래대로(그 행 아래 월 입력칸)
if (typeof agentExpEdOpenFinal === 'function') {
  var bbaExpEdOpenBefore = agentExpEdOpenFinal;
  agentExpEdOpenFinal = function (id) {
    if (!id) { bbaExpOpen(); return; }
    return bbaExpEdOpenBefore.apply(this, arguments);
  };
}

/* ═══ ③ 리스회계처리 대상 안내(AS-IS LeaseAccountingInfo.vue 문구 · 기준 그대로) ═══ */
var BBA_LEASE_ROWS = [
  { code: '706901', name: '승용차량비', yes: '업무용으로 렌트하는 차량, 사무실, 현지숙소 중 계약기간이 1년 초과인 경우', no: '1년 이하 단기계약 제외', span: 3 },
  { code: '711101', name: '사무실임차료' },
  { code: '706904', name: '현지숙소임차관리비' },
  { code: '711150', name: '기타임차료', yes: '창고, 서버공간, 500만 원 초과의 고가 장비/복합기/가구 임대 건 중 계약기간이 1년 초과인 경우', no: '개당 판매가 500만 원 이하의 소액리스 (예: 정수기, 안마기, 비데, 노트북, 태블릿, 빔, 프린터)' },
  { code: '625105', name: 'HW 사용료(임차료)', yes: '판매가격이 개당 500만 원 초과이고 계약기간이 1년 초과인 경우', no: '판매가격 개당 500만 원 이하이거나 1년 이하 단기 제외' },
  { code: '720150', name: '기타광고선전비', yes: '1년 초과 옥외 전광판 광고 등', no: '웹 사이트 배너광고, 1년 이하 단기 제외' },
  { code: '726301', name: '지급수수료', yes: '실체가 있는 자산(500만 원 초과)을 1년을 초과하여 임차하는 계약일 경우', no: '1회성 비용이나 단순 서비스 수수료' },
];
function bbaLeaseOpen(codes) {
  const pick = codes || [];
  const names = BBA_LEASE_ROWS.filter(function (r) { return pick.indexOf(r.code) >= 0; }).map(function (r) { return r.name; });
  bbaOpen(`
    <div class="bba-head">
      <div><strong>리스회계처리 대상 확인</strong>
        <span>${names.length ? `추가한 계정 중 <b>${bbaEsc(names.join(' · '))}</b>은(는) 리스회계처리 대상인지 확인이 필요합니다.` : '비용의 성격이 리스회계처리 대상인지 확인이 필요합니다.'}</span></div>
      <button class="bba-x" onclick="bbaClose()" title="닫기">✕</button>
    </div>
    <div class="bba-body">
      <div class="bba-lease-box">
        <b>아래 기준에 해당하면 재무담당(구 회계팀)에 계약서 등 관련 정보를 보내 주세요.</b>
        <ul>
          <li>현업은 기존과 같이 AP 처리하면 되며, 관련 회계처리는 재무담당 부서에서 진행합니다.</li>
          <li>리스회계 대상: 당사가 '식별되는 자산'을 사용료를 내고, 자산의 사용통제권을 일정 기간 이전받는 계약 (예: 사무실, 차량 렌트 등)</li>
          <li>단, 판매단가가 500만 원 이하이거나 계약기간이 1년 이하인 경우에는 제외할 수 있습니다.</li>
        </ul>
      </div>
      <div class="bba-tbl-wrap free">
        <table class="bba-tbl lease">
          <thead><tr><th>계정번호</th><th>계정명</th><th>리스회계처리 대상</th><th>리스회계 대상 아님</th></tr></thead>
          <tbody>${BBA_LEASE_ROWS.map(function (r) {
            const me = pick.indexOf(r.code) >= 0;
            return `
            <tr class="${me ? 'me' : ''}">
              <td class="code">${r.code}</td>
              <td><b>${bbaEsc(r.name)}</b>${me ? '<i class="bba-mine">추가한 계정</i>' : ''}</td>
              ${r.yes ? `<td ${r.span ? `rowspan="${r.span}"` : ''}>${bbaEsc(r.yes)}</td><td ${r.span ? `rowspan="${r.span}"` : ''}>${bbaEsc(r.no)}</td>` : ''}
            </tr>`; }).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="bba-foot">
      <button class="bba-ok" onclick="bbaClose()">확인</button>
    </div>`, true);
}

/* ── 화면에 버튼 달기 — 상품재료비 탭 [＋ 품목 등록] 왼쪽에 [엑셀 업로드] ───── */
function bbaDecorate() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('#s-budget .aglb-add[onclick^="agentMatEdOpenFinal("]').forEach(function (add) {
    if (add.previousElementSibling && add.previousElementSibling.classList.contains('bba-up')) return;
    const m = /agentMatEdOpenFinal\((\d+)/.exec(add.getAttribute('onclick') || '');
    const sub = m ? Number(m[1]) : -1;
    const nm = (typeof agentMatSubNamesFinal === 'function') ? agentMatSubNamesFinal()[sub] : '';
    if (typeof agentMatKindOfFinal !== 'function' || agentMatKindOfFinal(nm, sub) !== 'goods') return;
    const b = document.createElement('button');
    b.className = 'bba-up';
    b.setAttribute('onclick', 'event.stopPropagation();bbaMatOpen()');
    b.title = '엑셀 양식으로 여러 품목을 한 번에 등록합니다';
    b.textContent = '⬆ 엑셀 업로드';
    // [＋ 품목 등록]이 오른쪽으로 밀려 있으면(margin-left:auto) 그 자리를 엑셀 업로드가 대신 받아 둘이 나란히 서게 합니다
    if (window.getComputedStyle(add).marginLeft !== '0px') { b.style.marginLeft = 'auto'; add.style.marginLeft = '0'; }
    add.parentNode.insertBefore(b, add);
  });
}
if (typeof renderBudgetPage === 'function') {
  var bbaRenderBefore = renderBudgetPage;
  renderBudgetPage = function () {
    const r = bbaRenderBefore.apply(this, arguments);
    try { bbaDecorate(); } catch (e) {}
    return r;
  };
}

/* ── 스타일(이 화면 전용 · bba- 접두사) ─────────────────────────────── */
(function bbaInjectStyle() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('bba-style')) return;
  const st = document.createElement('style');
  st.id = 'bba-style';
  st.textContent = `
  .bba-dim { position:fixed; inset:0; z-index:120; display:flex; align-items:center; justify-content:center;
    background:rgba(15,23,42,.42); padding:20px; }
  .bba-pop { width:min(620px,100%); max-height:calc(100vh - 40px); display:flex; flex-direction:column; background:#fff;
    border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 24px 60px -28px rgba(15,23,42,.5); overflow:hidden; }
  .bba-pop.wide { width:min(980px,100%); }
  .bba-head { display:flex; align-items:flex-start; gap:12px; padding:18px 22px; border-bottom:1px solid #eef2f7; }
  .bba-head strong { display:block; font-size:18px; font-weight:800; color:#0f172a; }
  .bba-head span { display:block; margin-top:4px; font-size:14px; color:#64748b; line-height:1.55; }
  .bba-head span b { color:#0f172a; }
  .bba-x { margin-left:auto; border:0; background:transparent; color:#94a3b8; font-size:18px; cursor:pointer; padding:2px 6px; }
  .bba-body { flex:1 1 auto; min-height:0; overflow-y:auto; padding:18px 22px; }
  .bba-foot { display:flex; align-items:center; justify-content:flex-end; gap:8px; padding:14px 22px; border-top:1px solid #eef2f7; background:#fbfcfe; }
  .bba-foot button { border-radius:10px; padding:10px 18px; font:inherit; font-size:14.5px; font-weight:700; cursor:pointer; }
  .bba-foot button:disabled { opacity:.45; cursor:not-allowed; }
  .bba-cnt { margin-right:auto; font-size:14px; color:#64748b; }
  .bba-cnt b { color:#0f172a; }
  .bba-ok { border:1px solid #2563eb; background:#2563eb; color:#fff; }
  .bba-ok:not(:disabled):hover { background:#1d4ed8; }
  .bba-sub { border:1px solid #f59e0b; background:#fffbeb; color:#92400e; }
  .bba-sub:not(:disabled):hover { background:#fef3c7; }
  .bba-cancel { border:1px solid #cbd5e1; background:#fff; color:#475569; }
  .bba-btn { display:inline-flex; align-items:center; gap:4px; border:1px solid #cbd5e1; background:#fff; color:#334155;
    border-radius:9px; padding:7px 13px; font:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap; }
  .bba-btn:hover { border-color:#94a3b8; }
  .bba-btn.pri { border-color:#2563eb; background:#2563eb; color:#fff; }
  .bba-link { border:0; background:none; color:#2563eb; font:inherit; font-size:13.5px; text-decoration:underline; cursor:pointer; padding:0 4px; }
  .bba-steps { list-style:none; margin:0 0 16px; padding:0; display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .bba-steps li { display:flex; flex-wrap:wrap; align-items:center; gap:8px; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px; background:#f8fafc; }
  .bba-steps li > b { width:24px; height:24px; border-radius:50%; background:#0f172a; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:13px; }
  .bba-steps li > span { font-size:15px; font-weight:800; color:#0f172a; margin-right:auto; }
  .bba-steps li > em { flex-basis:100%; font-style:normal; font-size:13.5px; color:#64748b; }
  .bba-steps li > em i { font-style:normal; color:#dc2626; font-weight:800; }
  .bba-empty { border:1.5px dashed #cbd5e1; border-radius:12px; padding:34px 16px; text-align:center; background:#fcfdfe; }
  .bba-empty b { display:block; font-size:15px; color:#334155; }
  .bba-empty span { display:block; margin-top:6px; font-size:14px; color:#64748b; }
  .bba-sum { display:flex; flex-wrap:wrap; align-items:baseline; gap:6px 14px; margin-bottom:10px; font-size:14px; }
  .bba-sum span { color:#64748b; }
  .bba-sum b { color:#0f172a; font-size:15px; }
  .bba-sum em { font-style:normal; color:#b91c1c; font-weight:700; }
  .bba-tbl-wrap { border:1px solid #e2e8f0; border-radius:12px; overflow:auto; max-height:340px; }
  .bba-tbl-wrap.tall { max-height:420px; }
  .bba-tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .bba-tbl th { position:sticky; top:0; z-index:1; background:#f1f5f9; color:#475569; font-size:13px; font-weight:700; text-align:left;
    padding:10px 12px; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
  .bba-tbl td { padding:10px 12px; border-bottom:1px solid #f1f5f9; color:#334155; vertical-align:middle; font-size:14px !important; }
  .bba-tbl tr:last-child td { border-bottom:0; }
  .bba-tbl .c { text-align:center; }
  .bba-tbl .n { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .bba-tbl .code { color:#64748b; font-variant-numeric:tabular-nums; white-space:nowrap; }
  .bba-tbl b { color:#0f172a; font-weight:700; }
  .bba-tbl tr.bad td { background:#fef2f2; }
  .bba-tbl.pick tbody tr { cursor:pointer; }
  .bba-tbl.pick tbody tr:hover td { background:#f8fafc; }
  .bba-tbl.pick tbody tr.on td { background:#eff6ff; }
  .bba-tbl.pick tbody tr.off { cursor:default; }
  .bba-tbl.pick tbody tr.off td { color:#94a3b8; background:#fff; }
  .bba-tbl.pick tbody tr.off b { color:#94a3b8; }
  .bba-tbl input[type=checkbox] { width:17px; height:17px; cursor:pointer; }
  .bba-tbl-wrap.free { max-height:none; }
  .bba-tbl.lease td { line-height:1.55; }
  .bba-tbl.lease td:nth-child(2) { white-space:nowrap; }
  .bba-tbl.lease td[rowspan], .bba-tbl.lease tr:not(:has(td[rowspan])) td:nth-child(n+3) { width:36%; }
  .bba-tbl.lease tr.me > td:nth-child(-n+2) { background:#fffbeb; }
  .bba-st { display:inline-block; border-radius:999px; padding:2px 9px; font-size:12.5px; font-weight:700; background:#f1f5f9; color:#64748b; white-space:nowrap; }
  .bba-st.ok { background:#ecfdf5; color:#047857; }
  .bba-st.bad { background:#fee2e2; color:#b91c1c; }
  .bba-st.draft { background:#eff6ff; color:#1d4ed8; }
  .bba-star { border:0; background:none; font-size:19px; line-height:1; color:#cbd5e1; cursor:pointer; padding:2px 6px; }
  .bba-star.on { color:#f59e0b; }
  .bba-star:hover { color:#f59e0b; }
  .bba-lease, .bba-mine { display:inline-block; margin-left:7px; font-style:normal; font-size:12px; font-weight:700; border-radius:6px; padding:1px 7px; }
  .bba-lease { background:#f1f5f9; color:#64748b; }
  .bba-mine { background:#fef3c7; color:#92400e; }
  .bba-ctl { margin-left:6px; font-size:12px; color:#94a3b8; }
  .bba-none { text-align:center; color:#94a3b8; padding:28px 12px !important; }
  .bba-tools { display:flex; gap:10px; align-items:center; margin-bottom:12px; }
  .bba-search { flex:1 1 auto; border:1px solid #cbd5e1; border-radius:10px; padding:9px 13px; font:inherit; font-size:14.5px; }
  .bba-search:focus { outline:none; border-color:#2563eb; }
  .bba-seg { display:flex; border:1px solid #cbd5e1; border-radius:10px; overflow:hidden; flex:0 0 auto; }
  .bba-seg button { border:0; background:#fff; color:#475569; padding:9px 14px; font:inherit; font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap; }
  .bba-seg button + button { border-left:1px solid #cbd5e1; }
  .bba-seg button.on { background:#0f172a; color:#fff; }
  .bba-note { margin:12px 0 0; font-size:13.5px; color:#64748b; line-height:1.6; }
  .bba-lease-box { border:1px solid #fde68a; background:#fffbeb; border-radius:12px; padding:13px 16px; margin-bottom:14px; }
  .bba-lease-box b { font-size:15px; color:#78350f; }
  .bba-lease-box ul { margin:8px 0 0; padding-left:18px; font-size:14px; color:#57534e; line-height:1.7; }
  .bba-up { border:1px solid #cbd5e1; background:#fff; color:#334155; border-radius:9px; padding:7px 12px;
    font:inherit; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; margin-right:6px; }
  .bba-up:hover { border-color:#94a3b8; background:#f8fafc; }
  @media (max-width:720px) { .bba-steps { grid-template-columns:1fr; } .bba-tools { flex-wrap:wrap; } }`;
  document.head.appendChild(st);
})();
