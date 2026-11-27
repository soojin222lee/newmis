// ═══════════════════════════════════════════════════════════════════════════
//  수행원가 > 원가조정 > 인건비 — 실행예산 권한 설정(PM · 사업관리자) 팝업    작성: 남주
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE: [2026.11.27] AS-IS 「권한설정」을 목업에 더합니다(회의 원칙: AS-IS 기능은 삭제 합의 전까지 유지).
//   근거(AS-IS its-front performance/components/personnelExpenses)
//     grid/ResourcePlanDetailsGrid.vue — 인력자원계획 표 위 [권한설정] 버튼(openAuthoritySetupPopup), 역할 칸 옆 아이콘(setBizIcon)
//       · 표에서 1명만 체크해야 열림('권한을 부여할 자원을 먼저 선택하세요.' / '권한설정은 단 건만 가능합니다.')
//       · TBD 인력은 불가('TBD는 권한을 설정할 수 없습니다.')
//     popup/AuthoritySetupPopup.vue — 제목 '실행예산 권한 설정', 체크 [PM] [사업관리자], 안내 '※ PM은 한 명만 선택 가능합니다.'
//       · [등록] 때 다른 사람이 이미 PM이면 막음('PM은 한 명만 선택 가능합니다.') → PM 최대 1명
//       · 사업관리자는 화면에서 인원 제한 없음(여러 명 가능). 한 사람이 PM + 사업관리자 둘 다 가능
//     값: prjmYn(PM) · bizMngrYn(사업관리자)
//   목업: 사람마다 따로 여는 대신 한 팝업에 내부 인력 전체를 놓고 PM · 사업관리자를 체크(한눈에 누가 권한자인지 보이게).
//     제한 규칙은 AS-IS 그대로 — PM은 1명(이미 PM이 있는데 다른 사람을 체크하면 막고 안내), 사업관리자는 여러 명, TBD 불가.
//   저장하면 인력표 직급 옆 꼬리표(PM · 사업관리 · PM · 사업관리)가 바뀜(budget-labor-fields.js BLF_PEOPLE[].duty).
//   공유 파일은 고치지 않고 renderAgentLaborDetailFinal 출력만 감쌉니다. budget-labor-gantt.js 뒤에 로드.
// ═══════════════════════════════════════════════════════════════════════════

var blaDraft = null;   // { 이름: { pm: bool, biz: bool } } — 팝업에서 고치는 중인 값(저장 전)
var blaMsg = '';

function blaEsc(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s); }
function blaKey(name) { return String(name || '').replace(/\s/g, ''); }
function blaIsTbd(name) { return /^TBD/i.test(String(name || '').trim()); }
function blaPeople() {
  const rows = (typeof agentLaborRowsFinal === 'function') ? agentLaborRowsFinal() : [];
  const seen = {};
  return rows.filter(r => r.name && !seen[blaKey(r.name)] && (seen[blaKey(r.name)] = 1));
}
function blaDutyOf(name) {
  const p = (typeof BLF_PEOPLE !== 'undefined') ? BLF_PEOPLE[blaKey(name)] : null;
  const d = p && p.duty;
  return { pm: d === 'pm' || d === 'both', biz: d === 'biz' || d === 'both' };
}

function blaOpen() {                                    // crud R — 권한 설정 팝업 열기(지금 권한 조회)
  blaDraft = {};
  blaPeople().forEach(r => { blaDraft[blaKey(r.name)] = blaDutyOf(r.name); });
  blaMsg = '';
  blaPaint();
}
function blaToggle(name, kind, el) {                    // crud U — PM · 사업관리자 체크(저장 전)
  const k = blaKey(name);
  if (!blaDraft || !blaDraft[k]) return;
  const on = !!(el && el.checked);
  if (kind === 'pm' && on) {
    const other = Object.keys(blaDraft).find(x => x !== k && blaDraft[x].pm);
    if (other) {                                        // AS-IS: PM은 한 명만
      if (el) el.checked = false;
      blaMsg = 'PM은 한 명만 선택 가능합니다. 지금 PM은 ' + other + ' 님입니다 — 바꾸려면 먼저 ' + other + ' 님의 PM 체크를 풀어 주세요.';
      blaPaint();
      return;
    }
  }
  blaDraft[k][kind] = on;
  blaMsg = '';
  blaPaint();
}
function blaSave() {                                    // crud U — 권한 저장
  if (!blaDraft || typeof BLF_PEOPLE === 'undefined') return;
  const pms = Object.keys(blaDraft).filter(k => blaDraft[k].pm);
  if (pms.length > 1) { blaMsg = 'PM은 한 명만 선택 가능합니다.'; blaPaint(); return; }
  Object.keys(blaDraft).forEach(k => {
    const d = blaDraft[k];
    if (!BLF_PEOPLE[k]) BLF_PEOPLE[k] = {};
    const duty = d.pm && d.biz ? 'both' : d.pm ? 'pm' : d.biz ? 'biz' : '';
    if (duty) BLF_PEOPLE[k].duty = duty; else delete BLF_PEOPLE[k].duty;
  });
  blaClose();
  if (typeof showToast === 'function') showToast('실행예산 권한을 저장했습니다.');
  if (typeof renderBudgetPage === 'function') renderBudgetPage();
}
function blaClose() {                                   // crud N — 팝업 닫기(저장하지 않음)
  blaDraft = null; blaMsg = '';
  const el = document.getElementById('bla-pop');
  if (el) el.remove();
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && blaDraft) blaClose(); });

function blaPaint() {
  if (!blaDraft) return;
  let el = document.getElementById('bla-pop');
  if (!el) { el = document.createElement('div'); el.id = 'bla-pop'; document.body.appendChild(el); }
  const info = n => (typeof blfInfo === 'function') ? blfInfo(n) : {};
  const people = blaPeople();
  const pmName = Object.keys(blaDraft).find(k => blaDraft[k].pm) || '';
  const bizCnt = Object.keys(blaDraft).filter(k => blaDraft[k].biz).length;
  const q = n => blaEsc(String(n).replace(/'/g, "\\'"));
  const body = people.map(r => {
    const k = blaKey(r.name), d = blaDraft[k] || { pm: false, biz: false }, tbd = blaIsTbd(r.name);
    const sub = [info(r.name).pos, r.org].filter(Boolean).join(' · ');
    const box = (kind, on) => tbd ? '<span class="bla-na">—</span>'
      : `<label class="bla-chk" title="${blaEsc(r.name)} ${kind === 'pm' ? 'PM' : '사업관리자'}"><input type="checkbox" ${on ? 'checked' : ''} onchange="blaToggle('${q(r.name)}','${kind}',this)" aria-label="${blaEsc(r.name)} ${kind === 'pm' ? 'PM' : '사업관리자'}"></label>`;
    return `<tr class="${d.pm || d.biz ? 'on' : ''}${tbd ? ' tbd' : ''}">
      <td><b>${blaEsc(r.name)}</b>${tbd ? ' <em class="bla-tbd">권한 줄 수 없음</em>' : ''}</td>
      <td>${blaEsc(sub)}</td><td>${blaEsc(r.role || '')}</td>
      <td class="ctr">${box('pm', d.pm)}</td><td class="ctr">${box('biz', d.biz)}</td></tr>`;
  }).join('');
  el.innerHTML = `
    <div class="bih-dim" onclick="if(event.target===this)blaClose()">
      <div class="bih-pop bla-pop" role="dialog" aria-modal="true" aria-label="실행예산 권한 설정">
        <div class="bih-head">
          <div><strong>실행예산 권한 설정</strong><span>PM · 사업관리자는 이 프로젝트의 실행예산을 수정 · 결재 요청할 수 있습니다.</span></div>
          <button class="bih-x" onclick="blaClose()" aria-label="닫기">✕</button>
        </div>
        <div class="bih-body">
          <div class="bla-rule">
            <span><b>PM</b> 1명만 <em>${pmName ? '지금 ' + blaEsc(pmName) : '지정 안 됨'}</em></span>
            <span><b>사업관리자</b> 여러 명 가능 <em>지금 ${bizCnt}명</em></span>
            <span>한 사람이 PM과 사업관리자를 함께 맡을 수 있습니다 · TBD 인력은 권한을 줄 수 없습니다</span>
          </div>
          ${blaMsg ? `<p class="bla-msg" role="alert">${blaEsc(blaMsg)}</p>` : ''}
          <div class="bih-wrap"><table class="bih-table bla-table">
            <thead><tr><th>성명</th><th>직위 · 팀</th><th>역할</th><th class="ctr">PM</th><th class="ctr">사업관리자</th></tr></thead>
            <tbody>${body || '<tr><td colspan="5" class="bih-empty">실투입 인력이 없습니다.</td></tr>'}</tbody>
          </table></div>
        </div>
        <div class="bih-foot bla-foot">
          <button type="button" class="bih-close" onclick="blaClose()">취소</button>
          <button type="button" class="bla-save" onclick="blaSave()">저장</button>
        </div>
      </div>
    </div>`;
}

// ── 인건비 상세: 인력표 위 버튼 줄에 [권한 설정] ──
function blaApply(html) {
  if (!html || typeof document === 'undefined') return html;
  try {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const root = tpl.content;
    if (root.querySelector('.bla-open-btn')) return html;
    const at = root.querySelector('.aglb-bar .blg-open-btn') || root.querySelector('.aglb-bar .blp-month-btn') || root.querySelector('.aglb-bar .aglb-xpand-btn');
    if (!at) return html;
    at.insertAdjacentHTML('beforebegin', '<button class="bxe-btn bla-open-btn" onclick="blaOpen()" title="PM(1명) · 사업관리자(여러 명)를 지정합니다">권한 설정</button>');
    return tpl.innerHTML;
  } catch (e) { return html; }
}
(function () {
  const before = window.renderAgentLaborDetailFinal;
  if (typeof before !== 'function') return;
  window.renderAgentLaborDetailFinal = function () { return blaApply(before.apply(this, arguments)); };
})();

(function blaStyle() {
  if (typeof document === 'undefined' || document.getElementById('bla-style')) return;
  const st = document.createElement('style');
  st.id = 'bla-style';
  st.textContent = `
  #bla-pop .bih-pop.bla-pop { width:min(760px, 100%); }
  .bla-rule { display:flex; flex-wrap:wrap; gap:8px 18px; align-items:baseline; margin:0 0 12px; padding:10px 14px; background:#f6f7f9; border-radius:8px; font-size:13.5px; color:#4b5563; }
  .bla-rule b { color:#111827; font-weight:800; margin-right:4px; }
  .bla-rule em { font-style:normal; margin-left:6px; color:#1d4ed8; font-weight:700; }
  .bla-rule > span:last-child { flex-basis:100%; font-size:12.5px; color:#6b7280; }
  .bla-msg { margin:0 0 10px; padding:9px 12px; border-radius:8px; background:#fdecea; color:#b42318; font-size:13.5px; font-weight:700; }
  .bla-table td { vertical-align:middle; }
  .bla-table tr.on td { background:#f7f9ff; }
  .bla-table tr.tbd td { color:#9aa3af; }
  .bla-chk { display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:13.5px; font-weight:700; color:#374151; }
  .bla-chk input { width:17px; height:17px; margin:0; accent-color:#2f5bea; cursor:pointer; }
  .bla-na { color:#c4c9d2; }
  .bla-tbd { font-style:normal; font-size:11.5px; font-weight:700; color:#9aa3af; margin-left:4px; }
  .bla-foot { display:flex; justify-content:flex-end; gap:8px; }
  .bla-save { height:36px; padding:0 18px; border:0; border-radius:8px; background:#2f5bea; color:#fff; font:inherit; font-size:14px; font-weight:800; cursor:pointer; }
  .bla-save:hover { background:#244bd1; }`;
  document.head.appendChild(st);
})();
