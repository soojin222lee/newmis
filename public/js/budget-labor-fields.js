// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 > 인건비 — AS-IS 인건비 화면에 있던 칸(field) 채우기    작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: 회의(2026.11.24) 원칙 "AS-IS 필드는 삭제 합의 전까지 유지"에 따라, 목업 인건비 상세에서 빠진 칸을 더합니다.
//   근거(AS-IS): its-front performance/components/personnelExpenses/grid/_colsOption.ts
//     · resourcePlanDetailsGrid(내부 인력자원계획): 번호 · 단위업무 · 역할명 · 성명 · 팀명 · 직급 · Skill Set(Level)
//       · Assign Type · 투입정보(시작일 · 종료일 · 금액(KRW) · 단가(M/M) · M/M · M/D · M/H)
//       + 성명 글자색으로 PM(빨강) · 사업관리(파랑) 표시(ResourcePlanDetailsGrid.vue grid_info 범례)
//     · otGrid(OT 종업원급여): 귀속계정 · 계정과목 · 변경예산 · 실적 · 잔여예산
//   바꾸는 것
//     1) 실투입인건비 인력표: [번호] · [단위업무] · [Assign Type] · [단가(M/M)] 칸을 더하고,
//        인력 칸 아래 직급 + PM/사업관리 표시, 역할 칸 아래 Skill Set(Level), 총MM 칸 아래 M/D · M/H.
//        (15칸을 따로 펼치면 가로 스크롤이 생겨, 같이 보는 값은 한 칸에 두 줄로 묶음 — 엑셀에도 그대로 나감)
//     2) OT비 탭: 표 위에 귀속계정 · 계정과목 · 변경예산 · 실적 · 잔여예산 한 줄.
//   데이터: 직급 · 단위업무 · Skill Set · Assign Type · PM/사업관리는 목업 값(BLF_PEOPLE, 이름 기준).
//     M/D · M/H 는 목업 환산(1MM = 21일, 1일 = 8시간). AS-IS 는 M/D = M/H ÷ 8(ResourcePlanDetailsGridInput.vue).
//   공유 파일(budget-agent-console.js)은 고치지 않고 renderAgentLaborDetailFinal 출력만 감쌉니다.
//   budget-excel-export.js · budget-inline-edit.js 뒤에 로드(엑셀은 화면 표를 읽어 새 칸도 함께 나감).
// ═══════════════════════════════════════════════════════════════════════════

var BLF_MD_PER_MM = 21, BLF_MH_PER_MD = 8;
// 목업 인력 정보 — 실제로는 인력자원계획(SCM) · 인사 마스터에서 옵니다.
var BLF_PEOPLE = {
  '박지훈': { pos: '책임', work: '사업관리', skill: 'PMO(L4)', assign: 'Full Time', duty: 'biz' },
  '김서린': { pos: '선임', work: '화면 개발', skill: 'Vue.js(L3)', assign: 'Full Time' },
  '이봄': { pos: '책임', work: '사업관리', skill: 'PM(L4)', assign: 'Full Time', duty: 'pm' },
  '김하린': { pos: '선임', work: '화면 개발', skill: 'Vue.js(L3)', assign: 'Part Time' },
  '이서준': { pos: '선임', work: '설계', skill: 'DB 설계(L3)', assign: 'Full Time' },
  '정하윤': { pos: '사원', work: '설계', skill: 'UI 설계(L2)', assign: 'Full Time' },
};
var BLF_DUTY = { pm: { t: 'PM', cls: 'pm' }, biz: { t: '사업관리', cls: 'biz' }, both: { t: 'PM · 사업관리', cls: 'both' } };

function blfEsc(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s); }
function blfMd(n) { return Number(n || 0) % 1 ? blfNum(n, 1) : blfNum(n); }   // 252.0 → 252
function blfNum(n, d) { return Number(n || 0).toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
function blfInfo(name) { return BLF_PEOPLE[String(name || '').replace(/\s/g, '')] || {}; }
function blfTd(html, cls) { const td = document.createElement('td'); if (cls) td.className = cls; td.innerHTML = html; return td; }
function blfTh(text, cls) { const th = document.createElement('th'); if (cls) th.className = cls; th.textContent = text; return th; }
function blfSub(text, cls) { return `<small class="blf-sub ${cls || ''}">${text}</small>`; }

// 원래 8칸(인력 · 조직명 · 역할 · P레벨 · 투입기간 · 총MM · 금액 · 상태)에 새 칸 2개를 끼움 → 10칸.
//   뒤에서부터 넣어야 앞 칸 번호가 안 밀림: 조직명 뒤 단위업무 → 맨 앞 번호
//   단가(M/M)는 P레벨 칸 아래(단가는 P레벨로 정해짐), Assign Type은 투입기간 칸 아래(AS-IS '투입정보' 묶음)
//   — 칸을 따로 늘리면 1366px 노트북에서 금액 · 상태가 잘려서.
function blfInsert(tr, make) {
  const c = tr.children;
  if (c.length < 8) return;
  [['work', 2], ['no', 0]].forEach(([k, at]) => {
    const cell = make(k);
    if (cell) tr.insertBefore(cell, c[at]);    // null 이면 그 칸은 넣지 않음(합계 줄의 번호 칸)
  });
}

function blfLaborTable(root) {
  const table = [...root.querySelectorAll('table.aglb')].find(t => t.querySelector('tr.aglb-prow'));
  if (!table || table.dataset.blf) return;
  table.dataset.blf = '1';
  table.classList.add('blf-table');
  const rows = (typeof agentLaborRowsFinal === 'function') ? agentLaborRowsFinal() : [];

  const head = table.querySelector('thead tr');
  if (head) {
    const label = { no: ['번호', 'blf-no'], work: ['단위업무', ''] };
    blfInsert(head, k => blfTh(label[k][0], label[k][1]));
    // 원래 칸 이름도 AS-IS 이름을 함께
    const ths = head.children;
    ths[1].innerHTML = '인력 <small class="blf-hsub">직급</small>';
    ths[4].innerHTML = '역할 <small class="blf-hsub">Skill Set(Level)</small>';
    ths[5].innerHTML = 'P레벨 <small class="blf-hsub">단가(M/M)</small>';
    ths[6].innerHTML = '투입기간 <small class="blf-hsub">Assign Type</small>';
    ths[7].innerHTML = '총MM <small class="blf-hsub">M/D · M/H</small>';
  }

  let sumMm = 0;
  [...table.querySelectorAll('tbody tr.aglb-prow')].forEach((tr, i) => {
    const r = rows[i] || {};
    const info = blfInfo(r.name);
    const mm = Number(r.mm || 0); sumMm += mm;
    const md = mm * BLF_MD_PER_MM, mh = md * BLF_MH_PER_MD;
    const unit = Number(r.unitPrice || r.unit || 0), prev = Number(r.unitPrev || 0);
    blfInsert(tr, k => {
      if (k === 'no') return blfTd(String(i + 1), 'blf-no');
      return blfTd(blfEsc(info.work || '–'));
    });
    const td = tr.children;
    const duty = BLF_DUTY[info.duty];
    // 직급 줄에 PM · 사업관리 표시(이름 옆에 두면 칸이 넓어짐)
    td[1].insertAdjacentHTML('beforeend', blfSub(blfEsc(info.pos || '직급 미등록') + (duty ? ` <em class="blf-duty ${duty.cls}">${duty.t}</em>` : ''))
      + blfSub(blfEsc(r.org || ''), 'blf-org'));   // 표 자리가 좁을 때만 보임(조직명 칸 대신)
    td[4].insertAdjacentHTML('beforeend', blfSub(blfEsc(info.skill || 'Skill Set 미등록')));
    td[5].insertAdjacentHTML('beforeend', blfSub(unit ? blfNum(unit) + '원' : '단가 없음')
      + (prev && prev !== unit ? blfSub('5월 전<br>' + blfNum(prev) + '원', 'blf-prev') : ''));
    // 투입기간은 시작일 / ~ 종료일 두 줄 + Assign Type
    if (r.start || r.end) td[6].innerHTML = blfEsc(r.start || '') + '<br>~ ' + blfEsc(r.end || '');
    td[6].insertAdjacentHTML('beforeend', blfSub(blfEsc(info.assign || 'Full Time'), 'blf-assign' + (info.assign === 'Part Time' ? ' part' : '')));
    td[7].insertAdjacentHTML('beforeend', blfSub(blfMd(md) + 'MD · ' + blfNum(mh) + 'MH'));
  });

  // PM 지시 줄 · 합계 줄 — 칸 수만 맞춤
  table.querySelectorAll('tbody tr.aglb-dir').forEach(tr => blfInsert(tr, () => blfTd('')));
  const foot = table.querySelector('tfoot tr');
  if (foot && foot.children.length >= 8) {
    blfInsert(foot, k => k === 'no' ? null : blfTd(''));
    foot.children[0].colSpan = 2;    // '합계 N명'이 번호 칸까지
    const mmTd = foot.children[6];
    if (mmTd) mmTd.insertAdjacentHTML('beforeend', blfSub(blfMd(sumMm * BLF_MD_PER_MM) + 'MD · ' + blfNum(sumMm * BLF_MD_PER_MM * BLF_MH_PER_MD) + 'MH'));
  }
  // 펼친 월별 투입MM 줄은 표 전체 폭으로
  table.querySelectorAll('tr.aglb-detail > td[colspan]').forEach(td => { td.colSpan = 10; });
  const wrap = table.closest('.aglb-wrap');
  if (wrap && !root.querySelector('.blf-legend')) {
    wrap.insertAdjacentHTML('afterend', `<div class="blf-legend">
      <span><em class="blf-duty pm">PM</em><em class="blf-duty biz">사업관리</em> 프로젝트 권한자</span>
      <span>M/D · M/H 는 1MM = ${BLF_MD_PER_MM}일 · 1일 = ${BLF_MH_PER_MD}시간으로 환산(목업)</span></div>`);
  }
}
// OT비 탭 — AS-IS OT 그리드 머리 칸(귀속계정 · 계정과목 · 변경예산 · 실적 · 잔여예산)
function blfOtSummary(root) {
  if (typeof agentLabKindFinal === 'undefined' || agentLabKindFinal !== 'ot') return;
  const wrap = root.querySelector('.aglb-wrap');
  if (!wrap || root.querySelector('.blf-ot')) return;
  const list = (typeof agentLabRowsOfFinal === 'function') ? agentLabRowsOfFinal('ot') : [];
  const plan = list.reduce((t, x) => t + Number(x.amount || 0), 0);
  const act = (typeof getLaborOtActualTotalFinal === 'function') ? Number(getLaborOtActualTotalFinal() || 0) : 0;
  const remain = plan - act;
  wrap.insertAdjacentHTML('beforebegin', `
    <div class="blf-ot">
      <div><span>귀속계정</span><b>인건비</b></div>
      <div><span>계정과목</span><b>종업원급여-OT <i>701301</i></b></div>
      <div class="num"><span>변경예산</span><b>${blfNum(plan)}원</b></div>
      <div class="num"><span>실적</span><b>${blfNum(act)}원</b></div>
      <div class="num"><span>잔여예산</span><b class="${remain < 0 ? 'bad' : ''}">${remain < 0 ? '−' : ''}${blfNum(Math.abs(remain))}원</b></div>
    </div>`);
}

function blfApply(html) {
  if (!html || typeof document === 'undefined' || !document.createElement) return html;
  try {
    const tpl = document.createElement('template');
    if (!tpl.content) return html;
    tpl.innerHTML = html;
    blfLaborTable(tpl.content);
    blfOtSummary(tpl.content);
    return tpl.innerHTML;
  } catch (e) { return html; }
}
(function () {
  const before = window.renderAgentLaborDetailFinal;
  if (typeof before !== 'function') return;
  window.renderAgentLaborDetailFinal = function () { return blfApply(before.apply(this, arguments)); };
})();

(function blfStyle() {
  if (typeof document === 'undefined' || document.getElementById('blf-style')) return;
  const st = document.createElement('style');
  st.id = 'blf-style';
  st.textContent = `
  .blf-table th, .blf-table td { padding-left:7px; padding-right:7px; vertical-align:top; }
  .blf-table th:first-child, .blf-table td:first-child { padding-left:10px; }
  .aglb-wrap:has(.blf-table) { overflow-x:auto; container:blf / inline-size; }   /* 더 좁은 화면에서도 금액 · 상태가 잘리지 않게 */
  .blf-table td:nth-child(7) { white-space:nowrap; }
  .blf-table .blf-sub.blf-org { display:none; }
  /* 표 자리가 800px 보다 좁으면(예: 1366px 노트북 + 왼쪽 패널) 조직명 칸을 빼고 인력 칸 아래 줄로 옮김 · 칸 여백도 조금 줄임 */
  @container blf (max-width: 799px) {
    .blf-table th:nth-child(3), .blf-table tbody tr.aglb-prow > td:nth-child(3),
    .blf-table tbody tr.aglb-dir > td:nth-child(3), .blf-table tfoot td:nth-child(2) { display:none; }
    .blf-table .blf-sub.blf-org { display:block; }
    .blf-table th, .blf-table td { padding-left:5px; padding-right:5px; }
    .blf-table th:first-child, .blf-table td:first-child { padding-left:8px; }
  }
  .blf-table .blf-no { width:30px; text-align:center; color:#6b7280; }
  .blf-table .blf-hsub { display:block; margin-top:2px; font-size:10.5px; font-weight:700; color:#9aa3af; }
  .blf-table .blf-sub.blf-prev { font-size:11px; color:#9aa3af; }
  .blf-table .blf-sub { display:block; margin-top:3px; font-size:11.5px; font-weight:600; color:#6b7280; white-space:nowrap; }
  .blf-duty { display:inline-block; margin-left:3px; padding:1px 6px; border-radius:5px; font-style:normal; font-size:11px; font-weight:800;
    vertical-align:1px; white-space:nowrap; }
  .blf-duty.pm { background:#fdecec; color:#c0392b; }
  .blf-duty.biz { background:#e8f0fe; color:#1d4ed8; }
  .blf-duty.both { background:#f3e8ff; color:#7c3aed; }
  .blf-table .blf-sub.blf-assign.part { color:#b45309; font-weight:800; }
  .blf-legend { display:flex; flex-wrap:wrap; gap:6px 18px; margin:8px 2px 0; font-size:12px; color:#6b7280; }
  .blf-legend .blf-duty { margin:0 4px 0 0; }
  .blf-ot { display:grid; grid-template-columns:1fr 1.4fr 1fr 1fr 1fr; margin:0 0 10px; border:1px solid #e5e7eb; border-radius:10px; background:#fff; }
  .blf-ot > div { padding:10px 14px; border-left:1px solid #eef0f3; }
  .blf-ot > div:first-child { border-left:0; }
  .blf-ot > div.num { text-align:right; }
  .blf-ot span { display:block; font-size:12px; font-weight:700; color:#6b7280; }
  .blf-ot b { display:block; margin-top:3px; font-size:14.5px; font-weight:800; color:#111827; font-variant-numeric:tabular-nums; }
  .blf-ot b i { font-style:normal; font-size:12px; font-weight:600; color:#9aa3af; }
  .blf-ot b.bad { color:#c0392b; }
  `;
  document.head.appendChild(st);
})();
