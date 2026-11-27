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
//     3) [2026.11.26] 인건비 실적조회 팝업(공유 showActualDetailModal, [월별 계획/실적 보기]의 지난 달 금액으로 열림):
//        AS-IS its-front personnelExpenses/popup/AcrsPopup.vue 탭 3개 · 칸 그대로, 탭을 누르면 실제로 표가 바뀜.
//        모양은 외주비 · 재료비 실적조회(budget-insp-history.js .bih-*)와 같은 틀로 통일 — 제목 · 요약 3칸 · [탭] · 엑셀 · 표 · 안내 · 닫기.
//        [월별 계획/실적 보기] 팝업에서 누르면 팝업 위 팝업 없이 그 팝업 안에서 표 자리가 실적조회로 바뀌고 [← 월별 표로]로 돌아감.
//          · feature/nj : budget-monthly-view.js 의 팝업 안 전환(bmvDrill) 그대로 쓰고, 인건비 내용만 bmvDrillHtml 에서 바꿔 끼움
//          · 그 기능이 없는 브랜치 : 이 파일이 renderAgentAcctMonthlyPopFinal 을 감싸 같은 방식으로 팝업 안에서 전환
//        그 밖의 곳(인건비 [실적조회] 버튼 등)에서 열면 따로 팝업(#blf-act-pop). 공유 실적조회 모달은 인건비일 때 쓰지 않음.
//        - 사내인건비/사내간접비: NO · 실적발생월 · 부서 · 인건비전표번호 · 간접비전표번호 · 사번 · 성명 · 직위 · 소급여부
//          · 실제 투입월 · 실투입 MM · 실투입 인건비 · 실투입 간접비 · 발생일자 (예전 목업은 직위 뒤 '금액' 한 칸)
//        - 종업원급여-OT: NO · 급여지급월 · 사번 · 성명 · 근무년월 · 프로젝트번호 · 금액
//        - 이관인건비: NO · 실적발생월 · 계정 · SAP전표번호 · 입력자 · 전표일자 · 실적반영금액 · 내용 · 상호
//        데이터는 목업: 사내인건비 = 그 달 실투입 인력(인력표와 같은 사람) MM × 단가, 간접비 = 인건비 × 15%,
//        전표번호 = 인력 월별 '실적 생성' 전표와 같은 번호. OT = OT 실적 합계를 2건으로. 이관 = 그 달 집행완료 이관 건.
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
    ths[8].innerHTML = '금액(계획) <small class="blf-hsub">실적 · 잔여예산</small>';
  }

  let sumMm = 0, sumAct = 0, sumRemain = 0;
  const pr = {};    // 이름 → { plan, act } (펼침 줄에서 다시 씀)
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
    if (r.start || r.end) td[6].innerHTML = `<span class="blf-date">${blfEsc(r.start || '')}</span><br><span class="blf-date">~ ${blfEsc(r.end || '')}</span>`;
    td[6].insertAdjacentHTML('beforeend', blfSub(blfEsc(info.assign || 'Full Time'), 'blf-assign' + (info.assign === 'Part Time' ? ' part' : '')));
    td[7].insertAdjacentHTML('beforeend', blfSub(blfMd(md) + 'MD · ' + blfNum(mh) + 'MH'));
    // AS-IS 월별상세 실투입 탭의 실적 · 잔여예산 — 실적 = 실적 생성된 달(월마감)의 MM × 그 달 단가, 잔여 = 계획 − 실적
    const pa = blfPersonPlanAct(r);
    pr[r.key || r.name] = pa;
    const remain = pa.plan - pa.act;
    sumAct += pa.act; sumRemain += remain;
    td[8].insertAdjacentHTML('beforeend', blfSub('실적 ' + blfNum(pa.act)) + blfSub('잔여 ' + blfSigned(remain), remain < 0 ? 'blf-bad' : ''));
  });

  // PM 지시 줄 · 합계 줄 — 칸 수만 맞춤
  table.querySelectorAll('tbody tr.aglb-dir').forEach(tr => blfInsert(tr, () => blfTd('')));
  const foot = table.querySelector('tfoot tr');
  if (foot && foot.children.length >= 8) {
    blfInsert(foot, k => k === 'no' ? null : blfTd(''));
    foot.children[0].colSpan = 2;    // '합계 N명'이 번호 칸까지
    const mmTd = foot.children[6];
    if (mmTd) mmTd.insertAdjacentHTML('beforeend', blfSub(blfMd(sumMm * BLF_MD_PER_MM) + 'MD · ' + blfNum(sumMm * BLF_MD_PER_MM * BLF_MH_PER_MD) + 'MH'));
    const amtTd = foot.children[7];
    if (amtTd) amtTd.insertAdjacentHTML('beforeend', blfSub('실적 ' + blfNum(sumAct)) + blfSub('잔여 ' + blfSigned(sumRemain), sumRemain < 0 ? 'blf-bad' : ''));
  }
  // 펼친 월별 투입MM 줄은 표 전체 폭으로 + 달마다 실적 금액 칸(AS-IS 월별상세)
  let cur = null;
  [...table.querySelectorAll(':scope > tbody > tr')].forEach(tr => {
    if (tr.classList.contains('aglb-prow')) { const i = [...table.querySelectorAll('tbody tr.aglb-prow')].indexOf(tr); cur = rows[i] || null; return; }
    if (tr.classList.contains('aglb-detail') && cur) blfDetailActual(tr, cur, pr[cur.key || cur.name]);
  });
  table.querySelectorAll('tr.aglb-detail > td[colspan]').forEach(td => { td.colSpan = 10; });
  const wrap = table.closest('.aglb-wrap');
  if (wrap && !root.querySelector('.blf-legend')) {
    wrap.insertAdjacentHTML('afterend', `<div class="blf-legend">
      <span><em class="blf-duty pm">PM</em><em class="blf-duty biz">사업관리</em> 프로젝트 권한자</span>
      <span>M/D · M/H 는 1MM = ${BLF_MD_PER_MM}일 · 1일 = ${BLF_MH_PER_MD}시간으로 환산(목업)</span></div>`);
  }
}
function blfSigned(n) { return (n < 0 ? '−' : '') + blfNum(Math.abs(n)); }
// 인력 1명의 계획 · 실적 — 펼침 줄(agentLaborMonthlyRowFinal)과 같은 계산: 달마다 MM × 그 달 단가, 실적은 실적 생성된 달만
function blfPersonPlanAct(r) {
  const ms = (typeof agentLaborMonthsFinal === 'function') ? agentLaborMonthsFinal(r) : [];
  let plan = 0, act = 0;
  ms.forEach(x => {
    const unit = (typeof laborMonthUnitFinal === 'function') ? laborMonthUnitFinal(r, x.m) : Number(r.unitPrice || 0);
    const amt = Math.round(x.mm * unit);
    plan += amt;
    if (typeof agentLaborActualDoneFinal === 'function' && agentLaborActualDoneFinal(x.m)) act += amt;
  });
  return { plan, act };
}
// 펼친 월별 표 — '금액' → '계획 금액', 그 뒤에 '실적 금액' 칸(실적 생성된 달만), 머리 줄에 실적 · 잔여
function blfDetailActual(tr, r, pa) {
  const tbl = tr.querySelector('table.aglbd-tbl');
  if (!tbl || tbl.dataset.blf) return;
  tbl.dataset.blf = '1';
  const hr = tbl.querySelector('thead tr');
  if (hr && hr.children.length >= 5) {
    hr.children[3].textContent = '계획 금액';
    hr.insertBefore(blfTh('실적 금액', 'num'), hr.children[4]);
  }
  const ms = (typeof agentLaborMonthsFinal === 'function') ? agentLaborMonthsFinal(r) : [];
  [...tbl.querySelectorAll(':scope > tbody > tr')].forEach((row, i) => {    // :scope — 바깥 인력표 tbody 안이라 머리 줄까지 잡히지 않게
    const x = ms[i];
    if (!x || row.children.length < 5) return;
    const unit = (typeof laborMonthUnitFinal === 'function') ? laborMonthUnitFinal(r, x.m) : 0;
    const done = typeof agentLaborActualDoneFinal === 'function' && agentLaborActualDoneFinal(x.m);
    row.insertBefore(blfTd(done ? '<b>' + blfNum(Math.round(x.mm * unit)) + '원</b>' : '<span class="blf-mute">–</span>', 'num'), row.children[4]);
  });
  const fr = tbl.querySelector('tfoot tr');
  if (fr && fr.children.length >= 5 && pa) fr.insertBefore(blfTd('<b>' + blfNum(pa.act) + '원</b>', 'num'), fr.children[4]);
  const t = tr.querySelector('.aglbd-t span');
  if (t && pa) t.insertAdjacentHTML('beforeend', ` · 실적 ${blfNum(pa.act)}원 · 잔여 ${blfSigned(pa.plan - pa.act)}원`);
}

// 이관인건비 탭 — AS-IS 월별상세 '인건비 이관' 탭의 [번호] · [잔여예산] 칸
function blfTransferTable(root) {
  if (typeof agentLabKindFinal === 'undefined' || agentLabKindFinal !== 'transfer') return;
  const table = [...root.querySelectorAll('table.aglb')].find(t => t.querySelector('.agtr-kind') || t.querySelector('.aglb-empty'));
  if (!table || table.dataset.blfTr) return;
  table.dataset.blfTr = '1';
  table.classList.add('blf-tr-table');
  const list = ((typeof agentLabRowsOfFinal === 'function') ? agentLabRowsOfFinal('transfer') : []).slice()
    .sort((a, b) => String(a.expectedMonth || '').localeCompare(String(b.expectedMonth || '')));   // 원래 표와 같은 순서
  const act = x => (typeof agentLabTrActualFinal === 'function') ? agentLabTrActualFinal(x) : 0;
  const money = v => `${v > 0 ? '+' : v < 0 ? '−' : ''}${blfNum(Math.abs(v))}원`;
  const hr = table.querySelector('thead tr');
  if (!hr) return;
  // 칸 위치는 이름으로 찾음(일괄 편집 파일이 맨 앞에 체크박스 칸을 끼우기도 해서 번호로 세면 어긋남)
  const heads = [...hr.children].map(th => th.textContent.trim());
  const iAct = heads.indexOf('실적');
  if (iAct < 0) return;
  // 칸이 2개 늘어 표가 잘리지 않게: 발생 예정월은 이관 구분 칸 아래 줄로(AS-IS 도 월은 월별 칸으로 따로 보는 값), 내용은 줄바꿈
  const iKind = heads.indexOf('이관 구분'), iMonth = heads.indexOf('발생 예정월'), iDesc = heads.indexOf('내용');
  const fold = iKind >= 0 && iMonth === iKind + 1;
  hr.insertBefore(blfTh('잔여예산', 'num blf-tr-remain'), hr.children[iAct + 1]);
  if (fold) { hr.children[iKind].innerHTML = '이관 구분 <small class="blf-hsub">발생 예정월</small>'; hr.children[iMonth].remove(); }
  if (iDesc >= 0) hr.children[iDesc - (fold ? 1 : 0)].classList.add('blf-tr-desc');
  if (iDesc > 0) hr.children[iDesc - 1 - (fold ? 1 : 0)].classList.add('blf-tr-desc');   // 상대 프로젝트도 줄바꿈
  hr.insertBefore(blfTh('번호', 'blf-no'), hr.children[0]);
  let i = 0, sumRemain = 0;
  [...table.querySelectorAll(':scope > tbody > tr')].forEach(tr => {
    if (tr.querySelector('.agtr-kind') && tr.children.length === heads.length) {
      const x = list[i++] || {};
      const remain = Number(x.amount || 0) - act(x);
      sumRemain += remain;
      tr.insertBefore(blfTd(remain ? money(remain) : '<span class="blf-mute">0원</span>', 'num blf-tr-remain'), tr.children[iAct + 1]);
      if (fold) {
        const mTd = tr.children[iMonth];
        tr.children[iKind].insertAdjacentHTML('beforeend', blfSub(blfEsc(mTd.textContent.trim())));
        mTd.remove();
      }
      if (iDesc >= 0) tr.children[iDesc - (fold ? 1 : 0)].classList.add('blf-tr-desc');
      if (iDesc > 0) tr.children[iDesc - 1 - (fold ? 1 : 0)].classList.add('blf-tr-desc');
      tr.insertBefore(blfTd(String(i), 'blf-no'), tr.children[0]);
    } else if (tr.classList.contains('aglb-dir')) {
      tr.insertBefore(blfTd(''), tr.children[0]);       // 번호 칸(+1) · 잔여(+1) · 발생 예정월(−1)
    } else {
      const td = tr.querySelector('td[colspan]');
      if (td) td.colSpan = td.colSpan + (fold ? 1 : 2);
    }
  });
  const foot = table.querySelector('tfoot tr');
  if (foot) {
    const off = heads.length - foot.children.length;    // 합계 줄에는 체크박스 칸이 없을 수 있음
    const at = foot.children[iAct - off + 1];
    if (at) foot.insertBefore(blfTd(money(sumRemain), 'num blf-tr-remain'), at);
    const mTd = fold ? foot.children[iMonth - off] : null;
    if (mTd && !mTd.textContent.trim()) mTd.remove();
    foot.children[0].colSpan = (foot.children[0].colSpan || 1) + 1;    // '합계 N건'이 번호 칸까지
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
    blfTransferTable(tpl.content);
    return tpl.innerHTML;
  } catch (e) { return html; }
}
(function () {
  const before = window.renderAgentLaborDetailFinal;
  if (typeof before !== 'function') return;
  window.renderAgentLaborDetailFinal = function () { return blfApply(before.apply(this, arguments)); };
})();

// ── 인건비 실적조회 — AS-IS AcrsPopup.vue 탭 · 칸 ──────────────────────────────
var BLF_ACT_TABS = ['사내인건비/사내간접비', '종업원급여-OT', '이관인건비'];
var BLF_ACT_COLS = [
  ['NO', '실적발생월', '부서', '인건비전표번호', '간접비전표번호', '사번', '성명', '직위', '소급여부', '실제 투입월', '실투입 MM', '실투입 인건비', '실투입 간접비', '발생일자'],
  ['NO', '급여지급월', '사번', '성명', '근무년월', '프로젝트번호', '금액'],
  ['NO', '실적발생월', '계정', 'SAP전표번호', '입력자', '전표일자', '실적반영금액', '내용', '상호'],
];
var BLF_ACT_NUM = [[10, 11, 12], [6], [6]];          // 오른쪽 정렬 · 합계 칸
var BLF_INDIRECT_RATE = 0.15;                        // 목업: 간접비 = 인건비 × 15%
function blfActTabIdx(name) {
  const i = BLF_ACT_TABS.indexOf(name);
  if (i >= 0) return i;
  if (/OT/.test(name || '')) return 1;
  if (/이관/.test(name || '')) return 2;
  return 0;                                          // 실투입인건비 · 전체 · 그 밖
}
function blfEmpNo(name) { let h = 3; String(name).split('').forEach(c => { h = (h * 37 + c.charCodeAt(0)) % 100000; }); return ('0' + h).slice(-5); }
function blfNextMonth(m) { const y = +m.slice(0, 4), mo = +m.slice(5, 7); return mo === 12 ? (y + 1) + '-01' : y + '-' + ('0' + (mo + 1)).slice(-2); }
function blfPrevMonth(m) { const y = +m.slice(0, 4), mo = +m.slice(5, 7); return mo === 1 ? (y - 1) + '-12' : y + '-' + ('0' + (mo - 1)).slice(-2); }
function blfPrjNo() {
  const list = (typeof EXEC_BUDGET_PROJECTS !== 'undefined') ? EXEC_BUDGET_PROJECTS : [];
  const k = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  const p = list.find(x => x.key === k) || list.find(x => x.key === 'budgetMock');
  return p ? p.no : '';
}
function blfActRows(idx, m) {
  if (idx === 0) {
    const people = (typeof agentLaborBaseRowsFinal === 'function') ? agentLaborBaseRowsFinal() : [];
    const v = (typeof laborActualVoucherFinal === 'function') ? laborActualVoucherFinal(m) : { direct: '', indirect: '' };
    const rows = [];
    people.forEach(r => {
      const mm = Number((r.monthly || {})[m] || 0);
      if (!mm) return;
      const unit = (typeof laborMonthUnitFinal === 'function') ? laborMonthUnitFinal(r, m) : Number(r.unitPrice || 0);
      const amt = Math.round(mm * unit), ind = Math.round(amt * BLF_INDIRECT_RATE);
      const retro = blfEmpNo(r.name + m).slice(-1) === '7';       // 목업: 가끔 지난달 투입분이 이번 달에 소급 반영
      rows.push([rows.length + 1, m, blfEsc(r.org || ''), v.direct, v.indirect, blfEmpNo(r.name), blfEsc(r.name), blfEsc(blfInfo(r.name).pos || ''),
        retro ? 'Y' : 'N', retro ? blfPrevMonth(m) : m, mm, amt, ind, m + '-25']);
    });
    return rows;
  }
  if (idx === 1) {
    const tot = (typeof getLaborOtActualTotalFinal === 'function') ? Number(getLaborOtActualTotalFinal() || 0) : 0;
    if (!tot) return [];
    const half = Math.round(tot * 0.6 / 1000) * 1000;
    return [['이서준', half], ['정하윤', tot - half]].map((x, i) => [i + 1, blfNextMonth(m), blfEmpNo(x[0]), x[0], m, blfPrjNo(), x[1]]);
  }
  const list = (typeof agentLabRowsOfFinal === 'function') ? agentLabRowsOfFinal('transfer') : [];
  return list.filter(x => String(x.expectedMonth || '').slice(0, 7) === m && typeof agentLabTrActualFinal === 'function' && agentLabTrActualFinal(x))
    .map((x, i) => {
      const recv = (x.transferType || 'Receiver Project') === 'Receiver Project';
      const cp = x.counterpart && typeof agentLabPjtNameFinal === 'function' ? agentLabPjtNameFinal(x.counterpart) : (x.counterpart || '');
      return [i + 1, m, recv ? '이관인건비(받음)' : '이관인건비(보냄)', '51' + m.replace('-', '') + ('00' + (i + 1)).slice(-3), '이봄', m + '-28',
        agentLabTrActualFinal(x), blfEsc(x.description || ''), blfEsc(cp)];
    });
}
function blfActTableHtml(idx, m, rows) {
  const cols = BLF_ACT_COLS[idx], num = BLF_ACT_NUM[idx];
  rows = rows || blfActRows(idx, m);
  const isMm = c => c === 10 && idx === 0;
  const strong = c => c === num[num.length - 1] || (idx === 0 && c === 11);
  const cell = (v, c) => num.indexOf(c) < 0 ? v : (isMm(c) ? Number(v).toFixed(3) : blfNum(v));
  const cls = c => num.indexOf(c) >= 0 ? 'num' : (c === 0 ? 'ctr' : '');
  const sums = num.map(c => rows.reduce((s, r) => s + Number(r[c] || 0), 0));
  const first = Math.min.apply(null, num);
  return `<table class="bih-table blf-act-table" data-m="${m}" data-idx="${idx}">
    <thead><tr>${cols.map((c, i) => `<th class="${cls(i)}">${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map(r => `<tr>${r.map((v, c) => `<td class="${cls(c)}">${strong(c) ? '<b>' + cell(v, c) + '</b>' : cell(v, c)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${cols.length}" class="bih-empty">${m} 실적이 없습니다.</td></tr>`}</tbody>
    ${rows.length ? `<tfoot><tr class="total"><td colspan="${first}" class="ctr">합계 ${rows.length}건</td>${cols.slice(first).map((c, k) => {
      const i = first + k, s = num.indexOf(i);
      return `<td class="num">${s >= 0 ? (isMm(i) ? sums[s].toFixed(3) : blfNum(sums[s])) : ''}</td>`;
    }).join('')}</tr></tfoot>` : ''}
  </table>`;
}
// ── 내용 — 외주비 · 재료비 실적조회(bih)와 같은 틀: 요약 3칸 · [탭] · 엑셀 · 표 · 안내 ─────────────
var BLF_ACT_HINT = [
  '그 달 실제 투입된 사내 인력의 인건비 · 간접비 전표입니다(기존 프로미스 실적조회와 같은 칸).',
  '그 달 근무분으로 지급된 OT 종업원급여입니다.',
  '다른 프로젝트와 주고받은 인건비 이관 전표입니다.',
];
// strip: [2026.11.27] 월별 팝업 안에서는 위 요약 3칸 대신 「해당 줄」(budget-monthly-view.js bmvStripHtml — 지난 달 실적, 다른 달 누르면 이동)
//   외주비 · 재료비 등 다른 계정 실적 상세와 같은 틀. 따로 팝업(월별 팝업 밖)에서는 요약 3칸 그대로
function blfActBodyHtml(m, idx, strip) {
  const all = [0, 1, 2].map(i => blfActRows(i, m));
  const tot = [all[0].reduce((a, r) => a + r[11] + r[12], 0), all[1].reduce((a, r) => a + r[6], 0), all[2].reduce((a, r) => a + Number(r[6] || 0), 0)];
  const seg = i => `<button type="button" class="${idx === i ? 'on' : ''}" aria-pressed="${idx === i}" onclick="blfActTab('${m}', ${i})">${BLF_ACT_TABS[i]}</button>`;
  const won = n => blfNum(n) + '원';
  return `<div class="blf-act-body">
    ${strip || `<div class="bih-sum">
      <div><span>사내인건비 + 간접비</span><b>${won(tot[0])}</b></div>
      <div><span>종업원급여-OT</span><b>${won(tot[1])}</b></div>
      <div><span>이관인건비</span><b>${won(tot[2])}</b></div>
    </div>`}
    <div class="bih-bar">
      <div class="bih-seg" role="group" aria-label="실적 구분">${seg(0)}${seg(1)}${seg(2)}</div>
      <span class="bih-hint">${BLF_ACT_HINT[idx]}</span>
      <button type="button" class="bih-excel" onclick="blfActExcel()">엑셀 다운로드</button>
    </div>
    <div class="bih-wrap">${blfActTableHtml(idx, m, all[idx])}</div>
    <p class="bih-note">인건비 실적은 ERP 전표 기준으로 받아오며, 간접비는 인건비 전표와 같은 달에 함께 반영됩니다.</p>
  </div>`;
}
var BLF_LAB = (typeof CATS !== 'undefined' ? CATS[0] : '인건비');
function blfPrjName() {
  const list = (typeof EXEC_BUDGET_PROJECTS !== 'undefined') ? EXEC_BUDGET_PROJECTS : [];
  const k = (typeof currentBudgetProj !== 'undefined') ? currentBudgetProj : '';
  const p = list.find(x => x.key === k) || list.find(x => x.key === 'budgetMock');
  return p ? (p.name || '') : '';
}
function blfInMonthlyPop() {                            // 인건비 [월별 계획/실적 보기] 팝업이 열려 있나
  return typeof agentAcctMonthlyFinal !== 'undefined' && agentAcctMonthlyFinal === BLF_LAB && !!document.querySelector('.bmv-pop');
}
function blfHasBmvDrill() { return typeof bmvDrillOpen === 'function' && typeof bmvDrillHtml === 'function'; }

// ── 상태 · 전환 ──────────────────────────────────────────────────────────────
var blfActState = null;   // 따로 팝업: { m, idx }
var blfActInPop = null;   // 월별 팝업 안(이 파일 방식): { m, idx }
var blfActScroll = 0;     // 들어가기 전 월별 표 가로 스크롤 위치
var blfActPopH = 0;       // 들어가기 전 월별 팝업 높이 — 실적 상세에서도 같은 크기로(폭은 원래 팝업 폭 그대로)
function blfActOpen(m, idx) {                           // crud R — 인건비 실적조회 열기(월별 팝업 안이면 그 안에서)
  idx = idx || 0;
  if (blfInMonthlyPop()) {
    const pop = document.querySelector('.bmv-pop');
    blfActPopH = pop ? Math.round(pop.getBoundingClientRect().height) : 0;
    if (blfHasBmvDrill()) { bmvDrillOpen(BLF_LAB, m, BLF_ACT_TABS[idx]); return; }
    const sc = document.querySelector('.bmv-pop .bmv-scroll');
    if (sc) blfActScroll = sc.scrollLeft;
    blfActInPop = { m: m, idx: idx };
    bmvRerender();
    return;
  }
  blfActState = { m: m, idx: idx };
  blfActPaint();
}
function blfActTab(m, idx) {                            // crud R — 인건비 실적조회 탭 전환
  // [2026.11.27] 원가현황 등에서 연 실적 상세 따로 팝업(budget-monthly-view.js bmvAp)이면 그 팝업에서 전환
  if (typeof bmvAp !== 'undefined' && bmvAp && bmvAp.acct === BLF_LAB && typeof bmvApGo === 'function') { bmvApGo(m, BLF_ACT_TABS[idx]); return; }
  if (blfHasBmvDrill() && typeof bmvDrill !== 'undefined' && bmvDrill && bmvDrill.acct === BLF_LAB) {
    if (typeof bmvDrillGo === 'function') { bmvDrillGo(m, BLF_ACT_TABS[idx]); return; }   // 팝업 크기가 줄었다 늘었다 하지 않게(budget-monthly-view.js)
    bmvDrill = { acct: BLF_LAB, m: m, name: BLF_ACT_TABS[idx] };   // 스크롤 위치는 처음 들어올 때 값 그대로
    bmvRerender();
  } else if (blfActInPop) { blfActInPop = { m: m, idx: idx }; bmvRerender(); }
  else { blfActState = { m: m, idx: idx }; blfActPaint(); }
}
function blfActBack() {                                 // crud N — 실적조회 → 월별 표로 돌아가기
  blfActInPop = null;
  blfActPopH = 0;
  bmvRerender();
  const x = blfActScroll;
  requestAnimationFrame(() => { const sc = document.querySelector('.bmv-pop .bmv-scroll'); if (sc) sc.scrollLeft = x; });
}
function blfActClose() {                                // crud N — 인건비 실적조회 따로 팝업 닫기
  blfActState = null;
  const el = document.getElementById('blf-act-pop');
  if (el) el.remove();
}
function blfActExcel() {                                // crud R — 지금 보는 탭 표를 엑셀(.xlsx)로 다운로드
  const tb = document.querySelector('#blf-act-pop .blf-act-table') || document.querySelector('.bmv-pop .blf-act-table');
  if (!tb || typeof bxeSave !== 'function') { if (typeof showToast === 'function') showToast('내려받을 표가 없습니다.'); return; }
  const m = tb.getAttribute('data-m'), idx = Number(tb.getAttribute('data-idx')) || 0;
  const tab = BLF_ACT_TABS[idx].replace(/\//g, '·'), today = typeof bxeToday === 'function' ? bxeToday() : '';
  bxeSave(`인건비_실적조회_${m}_${tab}_${today}.xlsx`, [bxeSheet(tab,
    `인건비 실적조회 — ${m} · ${BLF_ACT_TABS[idx]}`, '단위: 원 · 내려받은 날: ' + today, bxeTableRows(tb))]);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && blfActState) blfActClose(); });

// ── 따로 팝업(월별 팝업 밖에서 열 때) ─────────────────────────────────────────
function blfActPaint() {
  const s = blfActState;
  if (!s) return;
  let el = document.getElementById('blf-act-pop');
  if (!el) { el = document.createElement('div'); el.id = 'blf-act-pop'; document.body.appendChild(el); }
  const ym = s.m.slice(0, 4) + '년 ' + Number(s.m.slice(5, 7)) + '월';
  const prj = blfPrjName();
  el.innerHTML = `
    <div class="bih-dim" onclick="if(event.target===this)blfActClose()">
      <div class="bih-pop" role="dialog" aria-modal="true" aria-label="인건비 실적조회">
        <div class="bih-head">
          <div>
            <strong>인건비 실적조회</strong>
            <span>${ym} 실적${prj ? ' · ' + blfEsc(prj) : ''}</span>
          </div>
          <button class="bih-x" onclick="blfActClose()" aria-label="닫기">✕</button>
        </div>
        <div class="bih-body">${blfActBodyHtml(s.m, s.idx)}</div>
        <div class="bih-foot"><button type="button" class="bih-close" onclick="blfActClose()">닫기</button></div>
      </div>
    </div>`;
}

// ── 월별 팝업 안에서 보이기 ──────────────────────────────────────────────────
// (1) feature/nj — 팝업 안 전환(bmvDrill)이 있으면 인건비 내용만 바꿔 끼움
(function () {
  if (typeof bmvDrillHtml !== 'function') return;
  const before = bmvDrillHtml;
  bmvDrillHtml = function (d) {
    if (!d || d.acct !== BLF_LAB || !/^\d{4}-\d{2}$/.test(String(d.m || ''))) return before.apply(this, arguments);
    return blfActBodyHtml(d.m, blfActTabIdx(d.name), typeof bmvStripHtml === 'function' ? bmvStripHtml(d) : '');
  };
})();
// (2) 그 기능이 없는 브랜치 — 이 파일이 월별 팝업을 감싸 같은 방식(표 자리 교체 + [← 월별 표로])으로
(function () {
  if (typeof bmvDrillOpen === 'function' || typeof renderAgentAcctMonthlyPopFinal !== 'function') return;
  const before = renderAgentAcctMonthlyPopFinal;
  renderAgentAcctMonthlyPopFinal = function (viewData, acct) {
    const html = before.apply(this, arguments);
    if (!html) { if (typeof agentAcctMonthlyFinal === 'undefined' || !agentAcctMonthlyFinal) { blfActInPop = null; blfActPopH = 0; } return html; }
    if (acct !== BLF_LAB) { blfActInPop = null; return html; }
    const out = html;                                  // 실적 금액(showActualDetailModal)은 아래 감싸기에서 안에서 전환
    const s = blfActInPop;
    if (!s) return out;
    const tpl = document.createElement('template');
    tpl.innerHTML = out;
    const pop = tpl.content.querySelector('.bmv-pop');
    const head = pop && pop.querySelector('.agv-pop-head > div');
    const body = pop && pop.querySelector('.agv-pop-body');
    if (!pop || !head || !body) return out;
    pop.classList.add('blf-pop-drill');
    if (blfActPopH) pop.style.height = blfActPopH + 'px';   // 들어가기 전 팝업과 같은 크기
    head.innerHTML = `<div class="blf-pop-title"><button type="button" class="blf-back" onclick="blfActBack()">← 월별 표로</button>
        <strong>${blfEsc(acct)} 월별 계획 / 실적 <em class="blf-crumb">› ${s.m} 실적 상세 · ${BLF_ACT_TABS[s.idx]}</em></strong></div>
      <span>그 달에 확정된 실적 내역입니다. [← 월별 표로]를 누르면 보던 표로 돌아갑니다.</span>`;
    body.innerHTML = blfActBodyHtml(s.m, s.idx);
    return tpl.innerHTML;
  };
})();
// (3) feature/nj — 팝업 안 전환(bmvDrill)으로 인건비 실적 상세를 볼 때도 들어가기 전 팝업 높이 그대로
(function () {
  if (typeof bmvDrillOpen !== 'function' || typeof renderAgentAcctMonthlyPopFinal !== 'function') return;
  const before = renderAgentAcctMonthlyPopFinal;
  renderAgentAcctMonthlyPopFinal = function (viewData, acct) {
    const html = before.apply(this, arguments);
    const drill = typeof bmvDrill !== 'undefined' && bmvDrill && bmvDrill.acct === BLF_LAB;
    if (!html || acct !== BLF_LAB || !drill) { if (!drill) blfActPopH = 0; return html; }
    // [2026.11.27] 월별 팝업(budget-monthly-view.js)이 모든 계정 공통으로 '최소 높이'를 걸면 그대로 — 높이를 고정하면 내용이 많을 때 스크롤이 생김
    if (!blfActPopH || /bmv-pop[^"]*" style="/.test(html)) return html;
    return html.replace(/(<div class="agv-pop aglm-pop bmv-pop[^"]*")/, '$1 style="height:' + blfActPopH + 'px"');
  };
  // 월별 표의 지난 달 금액은 bmvDrillOpen 을 바로 부름(showActualDetailModal 을 거치지 않음) → 여기서 들어가기 전 높이를 기억
  const open = bmvDrillOpen;
  bmvDrillOpen = function (acct, m, name) {
    if (acct !== BLF_LAB) return open.apply(this, arguments);
    if (!(typeof bmvDrill !== 'undefined' && bmvDrill)) {
      const pop = document.querySelector('.bmv-pop');
      blfActPopH = pop ? Math.round(pop.getBoundingClientRect().height) : 0;
    }
    // 제목(› 실적 상세 · 탭 이름)이 선택된 탭 이름과 같게 — '실투입인건비' → '사내인건비/사내간접비'
    return open.call(this, acct, m, BLF_ACT_TABS[blfActTabIdx(name)]);
  };
})();
// 공유 실적조회(showActualDetailModal) — 인건비 + 달 하나면 위 방식으로, 그 밖은 원래대로
(function () {
  const before = window.showActualDetailModal;
  if (typeof before !== 'function') return;
  window.showActualDetailModal = function (account, month, detailName) {
    if (account !== BLF_LAB || !/^\d{4}-\d{2}$/.test(String(month || ''))) return before.apply(this, arguments);
    try { blfActOpen(month, blfActTabIdx(detailName)); } catch (e) { return before.apply(this, arguments); }
  };
})();

(function blfStyle() {
  if (typeof document === 'undefined' || document.getElementById('blf-style')) return;
  const st = document.createElement('style');
  st.id = 'blf-style';
  st.textContent = `
  .blf-table th, .blf-table td { padding-left:7px; padding-right:7px; vertical-align:top; }
  .blf-table th:first-child, .blf-table td:first-child { padding-left:10px; }
  .aglb-wrap:has(.blf-table) { overflow-x:auto; container:blf / inline-size; }   /* 더 좁은 화면에서도 금액 · 상태가 잘리지 않게 */
  .blf-table .blf-date { white-space:nowrap !important; }   /* 날짜가 '2026-12- / 31'처럼 끊기지 않게 */
  .blf-table .blf-sub.blf-org { display:none; }
  /* 표 자리가 860px 보다 좁으면(예: 1366px 노트북) 조직명 칸을 빼고 인력 칸 아래 줄로 옮김 · 칸 여백도 조금 줄임
     (금액 칸 아래 실적 · 잔여가 들어가 800 → 860. '> thead' — 펼친 월별 표의 3번째 칸(단가)까지 숨기지 않게) */
  @container blf (max-width: 859px) {
    .blf-table > thead > tr > th:nth-child(3), .blf-table > tbody > tr.aglb-prow > td:nth-child(3),
    .blf-table > tbody > tr.aglb-dir > td:nth-child(3), .blf-table > tfoot > tr > td:nth-child(2) { display:none; }
    .blf-table .blf-sub.blf-org { display:block; }
    .blf-table th, .blf-table td { padding-left:4px; padding-right:4px; }
    .blf-table th:first-child, .blf-table td:first-child { padding-left:6px; }
    .blf-table tr.aglb-detail > td { padding-left:6px !important; padding-right:6px !important; }
    .blf-table .aglbd-tbl th, .blf-table .aglbd-tbl td { padding-left:6px !important; padding-right:6px !important; }
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
  .blf-table .blf-sub.blf-bad { color:#c0392b; }
  .blf-table tr.aglb-detail .aglbd-t { white-space:normal; }   /* 펼침 머리 줄(실적 · 잔여 붙음)이 표를 밀지 않게 */
  .blf-mute { color:#9aa3af; }
  .blf-tr-table .blf-no { width:30px; text-align:center; color:#6b7280; }
  .aglb-wrap:has(.blf-tr-table) { overflow-x:auto; }
  .blf-tr-table .blf-hsub { display:block; margin-top:2px; font-size:10.5px; font-weight:700; color:#9aa3af; }
  .blf-tr-table .blf-sub { display:block; margin-top:4px; font-size:11.5px; font-weight:600; color:#6b7280; white-space:nowrap; }
  .blf-tr-table .blf-tr-desc, .blf-tr-table .blf-tr-desc .agtr-cp { white-space:normal !important; min-width:100px; max-width:150px; }
  .blf-tr-table th, .blf-tr-table td { padding-left:8px; padding-right:8px; }
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
  /* 인건비 실적조회 — 틀은 .bih-*(budget-insp-history.js), 칸이 14개라 표만 내용 폭 + 가로 스크롤 */
  .bih-table.blf-act-table { width:max-content; min-width:100%; }
  #blf-act-pop .bih-pop { width:min(1320px,100%); }

  /* 월별 팝업 안에서 볼 때 — 팝업 크기는 월별 표일 때와 같게(폭 그대로 · 높이는 들어가기 전 높이), 14칸은 여백 · 글자를 줄여 그 폭에 맞춤 */
  .bmv-pop .blf-act-body .bih-wrap { max-height:none; }
  .bmv-pop .blf-act-body .bih-sum > div { padding:9px 16px; }
  .bmv-pop .blf-act-body .bih-sum b { margin-top:2px; font-size:17px; }
  .bmv-pop .blf-act-body .bih-bar { margin:12px 0 8px; }
  .bmv-pop .bih-table.blf-act-table th, .bmv-pop .bih-table.blf-act-table td { padding-top:9px; padding-bottom:9px; }
  .bmv-pop .bih-table.blf-act-table { font-size:13.5px; }
  .bmv-pop .bih-table.blf-act-table th, .bmv-pop .bih-table.blf-act-table td { padding-left:6px; padding-right:6px; }
  .bmv-pop .blf-act-body .bih-note { margin-bottom:0; }
  .blf-pop-title { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .blf-back { height:32px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; font:inherit; font-size:13.5px;
    font-weight:700; color:#1c2432; cursor:pointer; }
  .blf-back:hover { border-color:#2f5bea; color:#2f5bea; background:#f5f8ff; }
  .blf-crumb { font-style:normal; font-weight:700; color:#4b5563; margin-left:4px; }
  .bih-table.blf-act-table th, .bih-table.blf-act-table td { padding-left:9px; padding-right:9px; }
  `;
  document.head.appendChild(st);
})();
