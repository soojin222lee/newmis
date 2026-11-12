// ═══════════════════════════════════════════════════════════════════════════
//  프로젝트 > 수주형 프로젝트 상세 — [프로젝트 종료] 영역 (종료 페이지를 상세 안으로)   작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 따로 있던 '프로젝트 종료' 화면(project-close.js)을 프로젝트 상세 안의 한 영역으로 옮깁니다(2026.11.12, 담당자 없음 → 상세로 통합).
//   - 수주형 상세(siDetailHtml, backType '수주형') 진행 단계 카드 바로 아래에 [프로젝트 종료] 영역을 넣고,
//     머리의 [종료 처리 →]는 별도 화면 대신 이 영역으로 스크롤합니다.
//   - 영역 구성: 상태 · 종료 조건 체크(입금 제외) · 계약/프로젝트 종료일 · 산출물 · 자동종료 예외(등록된 경우) · 사후점검 결과보고서
//     버튼: [종료연기] [종료 신청]  |  관리자 전용: [강제종료] [자동종료 예외 등록/해제]
//   - 결정 사항(2026.11.12): 입금 여부 표시 안 함 · 임시종료일/자동종료 예정일 표기 안 함 ·
//     강제종료 / 자동종료 예외 등록은 관리자에게만 보임(목업은 PCI_IS_ADMIN=true 로 '관리자 전용' 표시와 함께 보여 줌)
//   - 미확정: 종료 조건은 4개 정도로 줄 예정(어느 4개인지 확인 필요) · 사후점검 결과보고서 칸은 없어질 수 있음
//   - 동작(종료연기 · 예외 · 종료 신청 · 강제종료 팝업)은 project-close.js 의 pc* 함수를 그대로 쓰고,
//     끝난 뒤 다시 그리기(renderProjectClose)만 상세로 돌립니다. 공유 파일은 고치지 않습니다.
//   - 메뉴 · 프로세스 지도 · AI 길안내의 '프로젝트 종료'(showProjectClose)는 수주형 프로젝트 목록으로 보냅니다.
// ═══════════════════════════════════════════════════════════════════════════

var PCI_IS_ADMIN = true;          // 목업: 관리자로 보고 관리자 전용 버튼을 보여 줌(실서비스는 권한으로 판단)

/* ── 종료 조건 — 입금 제외(2026.11.12) ─────────────────────────────────── */
if (typeof pcConditions === 'function') {
  var pcConditionsBeforePci = pcConditions;
  pcConditions = function (p) {
    return pcConditionsBeforePci(p).filter(function (c) { return c.label !== '입금 완료'; });
  };
}

/* ── 수주형 프로젝트도 종료 데이터에 포함 ─────────────────────────────── */
if (typeof getProjectCloseRows === 'function') {
  var getProjectCloseRowsBeforePci = getProjectCloseRows;
  getProjectCloseRows = function () {
    const rows = getProjectCloseRowsBeforePci();
    if (typeof SI_PROJECTS === 'undefined') return rows;
    Object.keys(SI_PROJECTS).forEach(function (id) {
      const s = SI_PROJECTS[id];
      if (!s || !s.code || rows.some(function (r) { return r.key === s.code; })) return;
      const ex = PROJECT_CLOSE_EXTRA[s.code] || {};
      const end = ex.projectEnd || s.end;
      const row = {
        key: s.code, no: s.code, name: s.name, closeNo: s.code, closeName: s.name,
        purchaseInspection: ex.purchaseInspection || '완료', deliverables: ex.deliverables || '미완료',
        billing: ex.billing || '완료', payment: '완료', staffing: ex.staffing || (s.stage === '종료완료' ? '완료' : '미완료'),
        expense: ex.expense || '완료', budgetInProgress: !!ex.budgetInProgress, rentalEquip: !!ex.rentalEquip,
        contractEnd: ex.contractEnd || end, projectEnd: end, exception: ex.exception || null,
        closed: ex.closed || (s.stage === '종료완료' ? { date: end, by: '종료' } : null), reportStatus: '계획',
      };
      row.tmpCloseDt = pcAddDays(end, 30);
      row.autoCloseDt = pcAddDays(end, 60);
      row.closeState = pcStatus(row);
      rows.push(row);
    });
    return rows;
  };
}

/* ── 다시 그리기 · 진입 ────────────────────────────────────────────────── */
if (typeof renderProjectClose === 'function') {
  var renderProjectCloseBeforePci = renderProjectClose;
  renderProjectClose = function () {
    // 상세 안에서 처리한 뒤에는 그 상세를 다시 그립니다(별도 종료 화면은 쓰지 않음)
    if (typeof siView !== 'undefined' && siView === 'detail' && typeof renderSIDetail === 'function') { renderSIDetail(); return; }
    return renderProjectCloseBeforePci.apply(this, arguments);
  };
}
// '프로젝트 종료' 메뉴 · 프로세스 지도 · AI 길안내 → 수주형 프로젝트 목록(종료는 상세에서)
showProjectClose = function () {                     // crud N
  if (typeof showSIProject === 'function') showSIProject();
  if (typeof showToast === 'function') showToast('프로젝트 종료는 각 프로젝트 상세의 [프로젝트 종료] 영역에서 처리합니다.');
};
// 머리 [종료 처리 →] — 종료 영역으로 스크롤
function pciGoto() {                                  // crud N
  const el = document.getElementById('pci-sec');
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.classList.remove('pci-flash'); void el.offsetWidth; el.classList.add('pci-flash');
}

/* ── 영역 그리기 ───────────────────────────────────────────────────────── */
function pciRowOf(code) {
  return (typeof getProjectCloseRows === 'function') ? getProjectCloseRows().find(function (r) { return r.key === code || r.closeNo === code; }) : null;
}
function pciSection(s) {
  const p = pciRowOf(s.code);
  if (!p) return '';
  pciInjectStyle();
  const st = p.closeState, closed = !!p.closed;
  const conds = pcConditions(p);
  const okN = conds.filter(function (c) { return c.ok; }).length;
  const esc = function (v) { return typeof siEsc === 'function' ? siEsc(v == null ? '' : String(v)) : String(v == null ? '' : v); };
  const k = esc(p.key);
  let note = '';
  if (closed) note = `<div class="pci-note ok">${esc(p.closed.date)}에 <b>${esc(p.closed.by)}</b>된 프로젝트입니다. ERP에 종료 정보를 전송했습니다.</div>`;
  else if (p.exception) note = `<div class="pci-note ok"><b>자동종료 예외</b> 등록 — ${esc(p.exception.until)}까지 ERP 프로젝트를 Active로 유지합니다. (사유: ${esc(p.exception.reason)} · ${esc(p.exception.memo)})</div>`;
  else if (st === '자동종료 보류') note = `<div class="pci-note warn">종료 조건을 충족하지 못해 <b>자동종료가 보류</b>됐습니다. 아래 미충족 조건을 처리하면 다음 자동종료 처리 때 종료됩니다.</div>`;
  const condHtml = conds.map(function (c) {
    const act = c.label === '빌링 완료' ? '<button class="pci-link" onclick="pcFieldAction(this)">빌링 이력조회</button>' : '';
    return `<div class="pci-cond ${c.ok ? 'ok' : 'ng'}" title="${c.ok ? '충족' : esc(c.msg)}"><i>${c.ok ? '✔' : '✖'}</i><span>${esc(c.label)}</span>${act}</div>`;
  }).join('');
  const field = function (label, v, btn) {
    return `<div class="pci-field"><span>${label}</span><b>${esc(v || '-')}</b>${btn ? `<button class="pci-link" onclick="pcFieldAction(this)">${btn}</button>` : ''}</div>`;
  };
  const stColor = (typeof PC_STATUS_COLOR !== 'undefined' && PC_STATUS_COLOR[st]) || '#1d4ed8';
  const admin = (!closed && PCI_IS_ADMIN) ? `
      <div class="pci-admin">
        <em title="관리자(PMO · 시스템관리자)에게만 보이는 버튼입니다">관리자 전용</em>
        <button class="sifr-btn pci-danger" onclick="pcForceClose('${k}')">⚠ 강제종료</button>
        ${p.exception
          ? `<button class="sifr-btn" onclick="pcClearException('${k}')">자동종료 예외 해제</button>`
          : `<button class="sifr-btn" onclick="pcOpenException('${k}')">자동종료 예외 등록</button>`}
      </div>` : '';
  return `
    <div class="sifr-sec pci-sec" id="pci-sec">
      <div class="sifr-sec-head">
        <h2>프로젝트 종료 <span class="pci-st" style="--c:${stColor}">${esc(st)}</span></h2>
        <div class="sifr-sub">${closed ? '종료된 프로젝트' : `종료 조건 ${okN}/${conds.length} 충족 · 모두 충족하면 [종료 신청], 종료일이 지나면 조건을 확인해 자동종료`}</div>
      </div>
      <div class="sifr-card pci-card">
        ${note}
        <div class="pci-conds">${condHtml}</div>
        <div class="pci-fields">
          ${field('계약 종료일', p.contractEnd)}
          ${field('프로젝트 종료일', p.projectEnd)}
          ${field('산출물 등록(선택)', p.deliverables, '산출물 등록')}
          ${field('종료 선언일', closed ? p.closed.date + ' (' + p.closed.by + ')' : '')}
          ${field('사후점검 결과보고서', p.reportStatus, '작성')}
        </div>
        ${p.exception && !closed ? `<div class="pci-exc"><b>자동종료 예외</b> ${esc(p.exception.reason)} · ERP 유지 기한 ${esc(p.exception.until)} · ${esc(p.exception.memo)} <span>(${esc(p.exception.by)} / ${esc(p.exception.at)})</span></div>` : ''}
        <p class="pci-help">※ 구매검수 “미완료”면 POP “검수/정산 &gt; 검수/대금지급현황”에서 AP번호 채번 여부를 확인하세요. 자동종료도 위 종료 조건을 똑같이 확인하며, 채우지 못하면 보류됩니다.</p>
        ${closed ? '' : `
        <div class="pci-foot">
          ${admin}
          <div class="pci-main">
            ${p.rentalEquip ? `<button class="sifr-btn" onclick="pcRentalCheck()">대여장비확인</button>` : ''}
            <button class="sifr-btn" onclick="pcOpenDelay('${k}')">종료연기</button>
            <button class="sifr-btn sifr-btn-primary" onclick="pcDeclareClose('${k}')">종료 신청</button>
          </div>
        </div>`}
      </div>
    </div>`;
}

/* ── 수주형 상세에 끼워 넣기 ───────────────────────────────────────────── */
if (typeof siDetailHtml === 'function') {
  var siDetailHtmlBeforePci = siDetailHtml;
  siDetailHtml = function (p, backOnclick, extraMeta, backType, backKey) {
    let html = siDetailHtmlBeforePci.apply(this, arguments);
    if (backType !== '수주형' || typeof html !== 'string') return html;
    // 착수 전(등록완료)은 종료 대상이 아니므로 영역 · [종료 처리] 버튼을 두지 않습니다
    if (typeof siPhase === 'function' && siPhase(p.stage) === 0) {
      return html.replace(/\s*<button class="sifr-btn sifr-btn-primary" onclick="showProjectClose\(\)">종료 처리 →<\/button>/, '');
    }
    let sec = '';
    try { sec = pciSection(p); } catch (e) { if (typeof console !== 'undefined') console.warn('[project-close-inline]', e); }
    html = html.replace('onclick="showProjectClose()">종료 처리 →', 'onclick="pciGoto()">종료 처리 ↓');
    if (!sec) return html;
    const at = html.indexOf('<div class="sifr-sec">');          // 진행 단계 카드 다음, 첫 섹션(선행 시스템 동기화) 앞
    return at < 0 ? html + sec : html.slice(0, at) + sec + html.slice(at);
  };
}

function pciInjectStyle() {
  if (document.getElementById('pci-style')) return;
  const st = document.createElement('style');
  st.id = 'pci-style';
  st.textContent = `
  .pci-sec .sifr-sec-head h2 { display:flex; align-items:center; gap:8px; }
  .pci-st { font-size:12px; font-weight:800; color:var(--c); background:color-mix(in srgb, var(--c) 10%, #fff); border:1px solid color-mix(in srgb, var(--c) 30%, #fff);
    border-radius:99px; padding:2px 10px; }
  .pci-card { padding:16px 18px; }
  .pci-note { border-radius:10px; padding:10px 13px; margin:0 0 12px; font-size:13px; line-height:1.55; }
  .pci-note.ok { background:#f0fdf4; border:1px solid #bbf7d0; color:#14532d; }
  .pci-note.warn { background:#fef2f2; border:1px solid #fecaca; color:#7f1d1d; }
  .pci-conds { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:8px; }
  .pci-cond { display:flex; align-items:center; gap:8px; border:1px solid #e2e8f0; border-radius:10px; padding:10px 12px; font-size:13px; font-weight:700; color:#1c2432; background:#fff; }
  .pci-cond i { font-style:normal; width:20px; height:20px; border-radius:99px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; flex:0 0 auto; }
  .pci-cond.ok i { background:#dcfce7; color:#166534; }
  .pci-cond.ng { border-color:#fecaca; background:#fffafa; }
  .pci-cond.ng i { background:#fee2e2; color:#b91c1c; }
  .pci-cond .pci-link { margin-left:auto; }
  .pci-fields { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:6px 18px; margin:14px 0 4px; padding-top:12px; border-top:1px dashed #e2e8f0; }
  .pci-field { display:flex; align-items:center; gap:8px; font-size:13px; min-height:28px; }
  .pci-field > span { color:#64748b; font-weight:700; min-width:110px; }
  .pci-field > b { color:#1c2432; font-weight:800; }
  .pci-link { border:0; background:none; padding:0; font:inherit; font-size:12px; font-weight:800; color:#2563eb; cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
  .pci-exc { margin:10px 0 0; font-size:12.5px; color:#0f766e; background:#f0fdfa; border:1px solid #99f6e4; border-radius:8px; padding:8px 12px; }
  .pci-exc span { color:#64748b; }
  .pci-help { margin:10px 0 0; font-size:11.5px; color:#94a3b8; line-height:1.6; }
  .pci-foot { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:14px; padding-top:12px; border-top:1px solid #eef2f7; }
  .pci-admin { display:flex; align-items:center; gap:6px; padding:4px 8px 4px 4px; border:1px dashed #fca5a5; border-radius:10px; background:#fffafa; }
  .pci-admin em { font-style:normal; font-size:11px; font-weight:900; color:#b91c1c; background:#fee2e2; border-radius:6px; padding:3px 7px; }
  .pci-admin .pci-danger { color:#b91c1c; border-color:#fca5a5; }
  .pci-main { display:flex; gap:8px; margin-left:auto; }
  .pci-sec.pci-flash .pci-card { animation:pciFlash 1.2s ease; }
  @keyframes pciFlash { 0% { box-shadow:0 0 0 0 rgba(37,99,235,.5); } 40% { box-shadow:0 0 0 6px rgba(37,99,235,.18); } 100% { box-shadow:0 0 0 0 rgba(37,99,235,0); } }`;
  document.head.appendChild(st);
}

/* ── 종료 신청 · 강제종료 뒤 수주형 프로젝트 상태도 '종료완료'로 ──────────── */
['pcDeclareClose', 'pcForceClose'].forEach(function (name) {
  const before = window[name];
  if (typeof before !== 'function') return;
  window[name] = function (key) {
    const s = (typeof SI_PROJECTS !== 'undefined') ? Object.keys(SI_PROJECTS).map(function (id) { return SI_PROJECTS[id]; }).find(function (x) { return x.code === key; }) : null;
    if (s && typeof siView !== 'undefined' && siView === 'detail') {
      const ex = PROJECT_CLOSE_EXTRA[key];
      const wasClosed = !!(ex && ex.closed);
      const keepRender = renderProjectClose;
      renderProjectClose = function () {};             // 상태를 맞춘 뒤 한 번만 다시 그림
      try { before.apply(this, arguments); } finally { renderProjectClose = keepRender; }
      if (!wasClosed && PROJECT_CLOSE_EXTRA[key] && PROJECT_CLOSE_EXTRA[key].closed) {
        if (s.ifHistory) s.ifHistory.unshift({ date: PC_TODAY + ' 09:00', field: '프로젝트상태', before: s.stage, after: '종료완료', source: '수동' });
        s.stage = '종료완료';
      }
      renderProjectClose();
      return;
    }
    return before.apply(this, arguments);
  };
});
