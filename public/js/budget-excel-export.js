// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 — 엑셀 다운로드 (월별 계획/실적 · 계정 예산내역)     작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 화면에 보이는 표를 그대로 .xlsx 파일로 내려받는 전용 파일입니다.
//   - 외부 라이브러리 없이 xlsx(OOXML)를 직접 만들고 무압축 ZIP으로 묶습니다(bxeXlsx · bxeZip).
//   - 표 → 행 변환(bxeTableRows)은 colspan/rowspan을 병합 셀로 옮기고, 체크박스 · 관리 열과
//     아직 저장하지 않은 입력 행(bie-row)은 뺍니다. "1,234" 같은 금액은 숫자 셀(#,##0)로 넣습니다.
//   - bxeMonthly(acct, btn): 버튼이 속한 월별 표(.bmv-wrap) — 원가조정 월별 팝업 · 원가현황 전체 현황/계정 예산내역
//   - bxeDetail(btn): 계정 상세 예산내역 표(지금 고른 상세계정 탭) — 표 위 막대의 [⬇ 엑셀]
//   - bxeActual(): 실적조회 · 인건비 투입계획 조회 팝업의 [엑셀](원래 동작 없던 버튼)에 연결
//   - 공통 버튼 디자인 .bxe-btn (원가조정 · 원가현황의 엑셀 버튼은 모두 이 모양)
//   공유 파일은 고치지 않습니다. budget-monthly-view.js 뒤에 로드합니다.
// ═══════════════════════════════════════════════════════════════════════════

/* ── 다운로드 공통 ─────────────────────────────────────────────────────── */
function bxeToday() {
  const d = new Date();
  return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
}
function bxeSafeName(s) { return String(s || '').replace(/[\\/:*?"<>|\[\]]/g, '_').replace(/\s+/g, ' ').trim(); }
function bxeProjName() {
  try {
    const d = (typeof BUDGET_SOURCE !== 'undefined' && typeof currentBudgetProj !== 'undefined') ? BUDGET_SOURCE[currentBudgetProj] : null;
    return (d && (d.projName || d.projectName || d.name || d.title)) || '';
  } catch (e) { return ''; }
}
function bxeToastMsg(m) {
  if (typeof showToast === 'function') showToast(m);
}
function bxeSave(fileName, sheets) {
  const bytes = bxeXlsx(sheets);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  bxeToastMsg(fileName + ' 파일을 내려받았습니다.');
}

/* ── 표(DOM) → 행 ──────────────────────────────────────────────────────── */
function bxeCellText(el) {
  const c = el.cloneNode(true);
  Array.prototype.forEach.call(c.querySelectorAll('.bie-delmark, button, input, select, textarea, script, style'), function (x) { x.remove(); });
  const parts = [];
  (function walk(n) {
    if (n.nodeType === 3) { parts.push(n.nodeValue); return; }
    if (n.nodeType !== 1) return;
    const block = /^(I|DIV|P|BR|SMALL|EM|SPAN|U|B|STRONG)$/.test(n.tagName);
    if (block) parts.push(' ');
    Array.prototype.forEach.call(n.childNodes, walk);
    if (block) parts.push(' ');
  })(c);
  return parts.join('').replace(/\s+/g, ' ').trim().replace(/^[∨∧▾▴▸›⊟⊞○●]\s*/, '');   // 펼침 · 트리 표시는 뺍니다
}
function bxeValue(text) {
  const t = String(text).replace(/−/g, '-').replace(/원$/, '').trim();
  if (/^[–—-]$/.test(t)) return '';                                    // 화면의 빈칸 표시(–)는 엑셀에선 빈칸
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t) || /^-?(0|[1-9]\d*)(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''));
  return text;
}
// opts.skipHead: 머리에 이 글자인 열을 뺍니다(기본 '관리')
function bxeTableRows(table, opts) {
  opts = opts || {};
  const skipHead = opts.skipHead || ['관리'];
  const grid = [], merges = [], meta = [];
  let headRows = 0, nextRow = 0;
  Array.prototype.forEach.call(table.rows, function (tr) {
    const sec = tr.parentNode.tagName;
    if (tr.classList.contains('bie-row')) return;                       // 저장 전 입력 행
    if (tr.cells.length === 1 && tr.cells[0].classList.contains('aglb-empty')) return;
    const r = nextRow++;                                                // rowspan이 미리 채운 줄도 그대로 씁니다
    grid[r] = grid[r] || [];
    meta[r] = { head: sec === 'THEAD', total: /total/.test(tr.className) };
    if (sec === 'THEAD') headRows++;
    let c = 0;
    Array.prototype.forEach.call(tr.cells, function (cell) {
      while (grid[r][c] !== undefined) c++;
      const cs = Math.max(1, cell.colSpan || 1), rs = Math.max(1, cell.rowSpan || 1);
      const skip = cell.classList.contains('bie-ckc');
      const v = skip ? { skip: true } : { text: bxeCellText(cell), th: cell.tagName === 'TH' };
      for (let i = 0; i < rs; i++) {
        grid[r + i] = grid[r + i] || [];
        for (let j = 0; j < cs; j++) grid[r + i][c + j] = (i === 0 && j === 0) ? v : { cover: true, skip: skip };
      }
      if (!skip && (cs > 1 || rs > 1)) merges.push([r, c, r + rs - 1, c + cs - 1]);
      c += cs;
    });
    if (!meta[r].total && grid[r][0] && /^합계$/.test((grid[r].find(function (x) { return x && x.text; }) || {}).text || '')) meta[r].total = true;
  });
  // 뺄 열 — 체크박스 열 · 머리가 '관리'인 열
  const width = grid.reduce(function (m, row) { return Math.max(m, row.length); }, 0);
  const drop = [];
  for (let c = 0; c < width; c++) {
    const col = grid.map(function (row) { return row[c]; });
    if (col.some(function (x) { return x && x.skip; })) { drop.push(c); continue; }
    if (col.slice(0, Math.max(headRows, 1)).some(function (x) { return x && x.th && skipHead.indexOf(x.text) >= 0; })) drop.push(c);
  }
  const map = [];
  for (let c = 0, k = 0; c < width; c++) map[c] = drop.indexOf(c) >= 0 ? -1 : k++;
  const rows = grid.map(function (row, r) {
    const out = [];
    for (let c = 0; c < width; c++) {
      if (map[c] < 0) continue;
      const x = row[c];
      if (!x || x.cover) { out.push(null); continue; }
      out.push({ v: meta[r].head ? x.text : bxeValue(x.text), s: meta[r].head ? 'head' : meta[r].total ? 'total' : 'body' });
    }
    return out;
  });
  const mg = merges.map(function (m) {
    let c1 = m[1], c2 = m[3];
    while (c1 <= c2 && map[c1] < 0) c1++;
    while (c2 >= c1 && map[c2] < 0) c2--;
    return c1 > c2 ? null : [m[0], map[c1], m[2], map[c2]];
  }).filter(function (m) { return m && (m[0] !== m[2] || m[1] !== m[3]); });
  return { rows: rows, merges: mg, headRows: headRows };
}
// 제목 줄을 얹은 시트 하나
function bxeSheet(name, title, sub, tableRows) {
  const pre = [[{ v: title, s: 'title' }], [{ v: sub, s: 'note' }], []];
  const off = pre.length;
  return {
    name: name,
    rows: pre.concat(tableRows.rows),
    merges: tableRows.merges.map(function (m) { return [m[0] + off, m[1], m[2] + off, m[3]]; }),
    freeze: off + tableRows.headRows,
  };
}

/* ── 월별 계획/실적 ────────────────────────────────────────────────────── */
function bxeMonthly(acct, btn) {
  const wrap = btn && btn.closest ? btn.closest('.bmv-wrap') : null;
  const t = wrap ? wrap.querySelector('.bmv-table') : document.querySelector('.bmv-pop .bmv-table');
  if (!t) { bxeToastMsg('내려받을 표가 없습니다.'); return; }
  const unit = (typeof bmvUnitInfo === 'function') ? bmvUnitInfo()[1] : '원';
  const mode = (typeof bmvMode !== 'undefined' && bmvMode === 'quarter') ? '분기별' : (typeof bmvMode !== 'undefined' && bmvMode === 'year') ? '연도별' : '월별';
  const year = (typeof bmvYear !== 'undefined' && bmvYear !== 'all') ? bmvYear + '년' : '전체 기간';
  const proj = bxeProjName();
  const title = (proj ? proj + ' · ' : '') + acct + ' 월별 계획/실적';
  const sub = '단위: ' + unit + ' · 보기: ' + mode + ' · ' + year + ' · 내려받은 날: ' + bxeToday();
  bxeSave(bxeSafeName(acct) + '_월별계획실적_' + bxeToday() + '.xlsx', [bxeSheet('월별 계획실적', title, sub, bxeTableRows(t))]);
}

/* ── xlsx 만들기 ───────────────────────────────────────────────────────── */
function bxeEsc(s) {
  return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function bxeCol(n) { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
// 스타일 번호 — styles.xml cellXfs 순서와 같아야 합니다
const BXE_STYLE = { title: 1, note: 2, head: 3, body: 4, bodyNum: 5, total: 6, totalNum: 7, bodyDec: 8, totalDec: 9 };
function bxeSheetXml(sh) {
  const widths = [];
  const rowsXml = sh.rows.map(function (row, r) {
    const cells = (row || []).map(function (x, c) {
      if (!x) return '';
      const ref = bxeCol(c) + (r + 1);
      const isNum = typeof x.v === 'number' && isFinite(x.v);
      const len = String(x.v == null ? '' : (isNum ? x.v.toLocaleString('en-US') : x.v)).replace(/[^\x00-\xff]/g, 'xx').length;
      if (x.s !== 'title' && x.s !== 'note') widths[c] = Math.max(widths[c] || 6, Math.min(len + 2, 60));
      const s = BXE_STYLE[(x.s === 'body' || x.s === 'total') && isNum ? x.s + (Number.isInteger(x.v) ? 'Num' : 'Dec') : x.s] || 0;
      if (isNum) return '<c r="' + ref + '" s="' + s + '"><v>' + x.v + '</v></c>';
      if (x.v === '' || x.v == null) return '<c r="' + ref + '" s="' + s + '"/>';
      return '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + bxeEsc(x.v) + '</t></is></c>';
    }).join('');
    return '<row r="' + (r + 1) + '">' + cells + '</row>';
  }).join('');
  const cols = widths.length ? '<cols>' + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + (w || 8) + '" customWidth="1"/>'; }).join('') + '</cols>' : '';
  const pane = sh.freeze ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="' + sh.freeze + '" topLeftCell="A' + (sh.freeze + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '';
  const mg = (sh.merges || []).length ? '<mergeCells count="' + sh.merges.length + '">' + sh.merges.map(function (m) {
    return '<mergeCell ref="' + bxeCol(m[1]) + (m[0] + 1) + ':' + bxeCol(m[3]) + (m[2] + 1) + '"/>';
  }).join('') + '</mergeCells>' : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + pane + cols + '<sheetData>' + rowsXml + '</sheetData>' + mg + '</worksheet>';
}
function bxeXlsx(sheets) {
  const names = [];
  sheets.forEach(function (sh, i) {
    let n = bxeSafeName(sh.name).slice(0, 31) || ('Sheet' + (i + 1));
    let k = 2; const base = n;
    while (names.indexOf(n) >= 0) n = base.slice(0, 28) + ' ' + (k++);
    names.push(n);
  });
  const ns = 'http://schemas.openxmlformats.org/';
  const files = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="' + ns + 'package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('')
      + '</Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + ns + 'package/2006/relationships">'
      + '<Relationship Id="rId1" Type="' + ns + 'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="' + ns + 'spreadsheetml/2006/main" xmlns:r="' + ns + 'officeDocument/2006/relationships"><sheets>'
      + names.map(function (n, i) { return '<sheet name="' + bxeEsc(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('')
      + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="' + ns + 'package/2006/relationships">'
      + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + ns + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('')
      + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="' + ns + 'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="' + ns + 'spreadsheetml/2006/main">'
      + '<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0"/><numFmt numFmtId="165" formatCode="#,##0.0#"/></numFmts>'
      + '<fonts count="4"><font><sz val="10"/><name val="맑은 고딕"/></font><font><b/><sz val="10"/><name val="맑은 고딕"/></font>'
      + '<font><b/><sz val="13"/><name val="맑은 고딕"/></font><font><sz val="9"/><color rgb="FF64748B"/><name val="맑은 고딕"/></font></fonts>'
      + '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>'
      + '<fill><patternFill patternType="solid"><fgColor rgb="FFEEF2FF"/></patternFill></fill></fills>'
      + '<borders count="2"><border/><border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right>'
      + '<top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom></border></borders>'
      + '<cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="10">'
      + '<xf/>'
      + '<xf fontId="2" applyFont="1"/>'
      + '<xf fontId="3" applyFont="1"/>'
      + '<xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
      + '<xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>'
      + '<xf numFmtId="164" borderId="1" applyNumberFormat="1" applyBorder="1"/>'
      + '<xf fontId="1" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="164" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '<xf numFmtId="165" borderId="1" applyNumberFormat="1" applyBorder="1"/>'
      + '<xf numFmtId="165" fontId="1" fillId="3" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>'
      + '</cellXfs></styleSheet>'],
  ];
  sheets.forEach(function (sh, i) { files.push(['xl/worksheets/sheet' + (i + 1) + '.xml', bxeSheetXml(sh)]); });
  return bxeZip(files);
}

/* ── 무압축 ZIP ────────────────────────────────────────────────────────── */
let BXE_CRC = null;
function bxeCrc32(b) {
  if (!BXE_CRC) {
    BXE_CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; BXE_CRC[n] = c >>> 0; }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < b.length; i++) c = BXE_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function bxeZip(files) {
  const enc = new TextEncoder();
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], central = [];
  let offset = 0;
  files.forEach(function (f) {
    const name = enc.encode(f[0]), data = enc.encode(f[1]), crc = bxeCrc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, time, true); h.setUint16(12, date, true); h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, time, true); c.setUint16(14, date, true); c.setUint32(16, crc, true);
    c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + data.length;
  });
  const cdSize = central.reduce(function (t, p) { return t + p.length; }, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
  e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  const all = parts.concat(central, [new Uint8Array(e.buffer)]);
  const out = new Uint8Array(all.reduce(function (t, p) { return t + p.length; }, 0));
  let p = 0; all.forEach(function (x) { out.set(x, p); p += x.length; });
  return out;
}

/* ── 계정 예산내역 표 ─────────────────────────────────────────────────────
   계정 상세(인건비 · 외주비 · 재료비 · 경비 · A/S Cost) 표 위 막대에 [⬇ 엑셀]을 둡니다.
   budget-inline-edit.js가 감싼 렌더러를 한 번 더 감싸므로, 체크박스 · 입력 행이 붙은 뒤의 표를 받습니다.
   내려받을 때는 화면 DOM에서 표를 읽고(bxeTableRows), 저장 전 입력 행 · 체크박스 · 관리 열은 뺍니다. */
['renderAgentLaborDetailFinal', 'renderAgentOutsourceDetailFinal', 'renderAgentMaterialDetailFinal',
 'renderAgentExpenseDetailFinal', 'renderAgentAsDetailFinal'].forEach(function (name) {
  const before = window[name];
  if (typeof before !== 'function') return;
  window[name] = function () { return bxeAddDetailButton(before.apply(this, arguments)); };
});
function bxeAddDetailButton(html) {
  if (!html || typeof document === 'undefined' || !document.createElement) return html;
  try {
    const tpl = document.createElement('template');
    if (!tpl.content) return html;
    bxeInjectStyle();
    tpl.innerHTML = html;
    const root = tpl.content;
    const wrap = root.querySelector('.aglb-wrap');
    if (!wrap || !wrap.querySelector('table')) return html;
    let bar = Array.prototype.find.call(root.querySelectorAll('.aglb-bar, .agex-bar'), function (b) { return !b.closest('.agos-panel, table'); });
    if (!bar) {                                                         // 실투입인건비처럼 막대가 없는 표
      bar = document.createElement('div');
      bar.className = 'aglb-bar';
      wrap.parentNode.insertBefore(bar, wrap);
    }
    const b = document.createElement('button');
    b.className = 'bxe-btn';
    b.setAttribute('onclick', 'event.stopPropagation();bxeDetail(this)');
    b.title = '이 표(저장된 내역)를 엑셀(.xlsx)로 내려받습니다 — 저장 전 입력 행은 빠집니다';
    b.textContent = '⬇ 엑셀 다운로드';
    bar.insertBefore(b, bar.querySelector('.bie-delsel, .aglb-add, .bie-savebar') || null);
    return tpl.innerHTML;
  } catch (e) { if (typeof console !== 'undefined') console.warn('[budget-excel-export]', e); return html; }
}
function bxeDetail(btn) {
  const body = btn.closest('.agga-col-body') || btn.parentNode.parentNode;
  const acct = (typeof agentAiSheetFinal !== 'undefined' && agentAiSheetFinal) || '계정';
  const on = body.querySelector('.aglb-tabs button.on');
  const tab = on ? bxeCellText(on.querySelector('.aglb-tabname') || on) : '';
  const yr = body.querySelector('.agex-bar button.on');
  const label = tab || (yr ? bxeCellText(yr) : '') || '예산내역';
  const tables = Array.prototype.filter.call(body.querySelectorAll('.aglb-wrap table'), function (t) {
    return t.tHead && !t.parentNode.closest('table') && !t.closest('.agv-pop');
  });
  if (!tables.length) { bxeToastMsg('내려받을 표가 없습니다.'); return; }
  const proj = bxeProjName();
  const sub = '단위: 원 · 저장된 내역 기준(저장 전 입력 행 제외) · 내려받은 날: ' + bxeToday();
  const sheets = tables.map(function (t, i) {
    const panel = t.closest('.agos-panel');
    const head = panel && panel.querySelector('.agos-panel-head');
    const nm = i === 0 ? label : (head ? bxeCellText(head).replace(/선택삭제/g, '').trim() : label + ' ' + (i + 1));
    return bxeSheet(nm, (proj ? proj + ' · ' : '') + acct + ' 예산내역 — ' + nm, sub, bxeTableRows(t));
  });
  bxeSave(bxeSafeName(acct) + '_' + bxeSafeName(label) + '_예산내역_' + bxeToday() + '.xlsx', sheets);
}

/* ── 조회 팝업 [엑셀] ───────────────────────────────────────────────────
   실적조회(showActualDetailModal) · 인건비 투입계획 조회(showLaborPlanDetailModal) 팝업의 [엑셀] 버튼은 동작이 없었습니다.
   팝업을 그린 뒤 그 버튼에만 내려받기와 공통 디자인(bxe-btn)을 붙입니다(공유 렌더러는 그대로). */
function bxeWireModalButton() {
  const btn = document.querySelector('#actual-detail-modal .actual-detail-toolbar button');
  if (!btn) return;
  btn.setAttribute('onclick', 'bxeActual()');
  btn.className = 'bxe-btn';
  btn.textContent = '⬇ 엑셀 다운로드';
}
['showActualDetailModal', 'showLaborPlanDetailModal'].forEach(function (name) {
  const before = window[name];
  if (typeof before !== 'function') return;
  window[name] = function () {
    const r = before.apply(this, arguments);
    try { bxeWireModalButton(); } catch (e) { /* 버튼이 없으면 그대로 */ }
    return r;
  };
});
function bxeActual() {
  const m = document.getElementById('actual-detail-modal');
  const t = m && m.querySelector('.actual-detail-table');
  if (!t) { bxeToastMsg('내려받을 표가 없습니다.'); return; }
  const head = m.querySelector('.actual-detail-head strong');
  const title = (head ? bxeCellText(head) : '') || '조회';
  const month = (m.querySelector('.actual-detail-filter input') || {}).value || '';
  const tab = m.querySelector('.actual-detail-tabs button.active');
  const nm = (tab ? bxeCellText(tab) : '') || title;
  bxeSave(bxeSafeName(title.replace(/\s+/g, '')) + '_' + bxeSafeName(month) + '_' + bxeToday() + '.xlsx',
    [bxeSheet(nm, title + ' — ' + month + ' · ' + nm, '단위: 원 · 내려받은 날: ' + bxeToday(), bxeTableRows(t))]);
}

/* ── 공통 [⬇ 엑셀 다운로드] 버튼 디자인 ─────────────────────────────────
   원가조정 · 원가현황의 엑셀 버튼은 모두 이 class(bxe-btn)를 씁니다. 파일을 읽을 때 한 번 넣습니다. */
function bxeInjectStyle() {
  if (typeof document === 'undefined' || !document.head || document.getElementById('bxe-style')) return;
  const st = document.createElement('style');
  st.id = 'bxe-style';
  st.textContent = `
  .bxe-btn { display:inline-flex; align-items:center; gap:4px; height:32px; border:1px solid #86efac; background:#f0fdf4; color:#166534;
    border-radius:8px; padding:0 12px; font:inherit; font-size:12.5px; font-weight:800; cursor:pointer; white-space:nowrap; box-shadow:none; }
  .bxe-btn:hover { background:#dcfce7; border-color:#4ade80; }
  .agex-bar .bxe-btn { margin-left:auto; }
  .agex-bar .bxe-btn ~ .aglb-add, .agex-bar .bxe-btn ~ .bie-delsel { margin-left:0; }
  .actual-detail-toolbar .bxe-btn { margin-left:auto; }`;
  document.head.appendChild(st);
}
bxeInjectStyle();
