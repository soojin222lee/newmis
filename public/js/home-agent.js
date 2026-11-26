// ═══════════════════════════════════════════════════════════════════════════
//  메인 홈 — Agent와의 업무 대화 + 오른쪽 대화 기록 · 왼쪽 즐겨찾기/최근 본 화면      작성: 남주
//  (시안 브랜치 feature/nj 전용 — develop 에는 없음)
// ───────────────────────────────────────────────────────────────────────────
// AI GUIDE:
//   · 홈(s-main) = Agent와 나누는 업무 대화. 공유 셸(shell-v2.js)의 renderHomeV2 를 다시 정의합니다.
//       - 오늘 대화: 08:30 Agent 브리핑(먼저 볼 3가지) → 이어서 묻기(버튼 · 직접 입력)
//       - [+ 새 대화]: "이런 일을 도와드려요" 4칸(할 일 정리 · 숫자 원인 분석 · 이상징후 확인 · 화면 찾기)
//       - 답은 목업(정해진 질문은 카드로, 그 밖에는 안내). 조정안 카드 [이대로 반영] = 반영 완료 표시 + 안내
//   · 오른쪽 = 대화 기록 패널(새 대화 · 검색 · 오늘/어제/지난주 묶음). 머리의 [»]로 접고, 접힌 띠를 누르면 다시 폄.
//   · 왼쪽 레일 = 즐겨찾기 → 최근 본 화면 → 담당 프로젝트. 공유 셸의 v2AppRailHtml 출력에 두 칸을 끼워 넣고,
//     아래쪽 '즐겨찾기' 버튼은 위 칸으로 옮겼으므로 뺍니다. 즐겨찾기 데이터 = favorites.js(newmis.favorites),
//     최근 본 화면 = 이 파일이 화면 이동을 지켜보며 기록(localStorage hag-recent).
//   · 원가조정 등 다른 화면: [✦ AI에게 물어보기](budget-design-e.js) 왼쪽에 문서 아이콘 → 대화 기록 드롭다운.
//     기록을 고르면 AI 창(#dde-ai)을 켜고 그 대화를 창 안에 펼쳐 보여 줌([← 지금 대화로]로 돌아감).
//     홈에서는 AI 버튼 · 문서 아이콘 · AI 창을 숨깁니다(홈 자체가 대화 화면).
//   · 대화 기록은 이 브라우저에만 저장(localStorage hag-threads-v1, 없으면 목업 기록으로 시작).
//   공유 파일은 고치지 않습니다. shell-v2.js · favorites.js · app-tabs.js · budget-design-e.js 뒤에 로드합니다.
// ═══════════════════════════════════════════════════════════════════════════

var HAG_KEY = 'hag-threads-v1', HAG_RECENT_KEY = 'hag-recent', HAG_SIDE_KEY = 'hag-side';
var hagCur = '';            // 지금 보는 대화 id
var hagBriefOpen = false;   // 브리핑을 다시 펼쳤는지
var hagQuery = '';          // 대화 기록 검색어
var hagSideOpen = (function () { try { return localStorage.getItem(HAG_SIDE_KEY) !== '0'; } catch (e) { return true; } })();

function hagEsc(s) { return typeof escHtml === 'function' ? escHtml(s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function hagPad(n) { return ('0' + n).slice(-2); }
function hagDay(offset) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (offset || 0)); return d; }
function hagNowT() { const d = new Date(); return hagPad(d.getHours()) + ':' + hagPad(d.getMinutes()); }
var HAG_WD = ['일', '월', '화', '수', '목', '금', '토'];
function hagDateLabel(d) { return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + HAG_WD[d.getDay()] + ')'; }
function hagShortDate(d) { return (d.getMonth() + 1) + '.' + hagPad(d.getDate()); }
function hagUserName() { return '이봄'; }
function hagMockKey() { return (typeof MOCK_PJT !== 'undefined' && MOCK_PJT.key) || 'budgetMock'; }
function hagPjts() { try { return (typeof homeCardPjts === 'function' ? homeCardPjts() : []) || []; } catch (e) { return []; } }
function hagPjtName(k) {
  const p = hagPjts().find(x => x.id === k) || ((typeof HOME_PROJECTS !== 'undefined') ? HOME_PROJECTS.find(x => x.id === k) : null);
  if (p) return p.name;
  if (typeof BUDGET_PROJ_META !== 'undefined' && BUDGET_PROJ_META[k]) return BUDGET_PROJ_META[k].name;
  return k || '';
}
function hagShortPjt(name) { return String(name || '').replace(/\s*(시스템 구축|고도화|자동화)$/, ''); }

// ── 대화 데이터 ──────────────────────────────────────────────────────────────
// thread: { id, title, sub, day(며칠 전), msgs: [{ who:'me'|'ag', t, tag, kind, html, applied }] }
function hagSeed() {
  const mock = '예산관리시스템 목업용';
  return [
    { id: 't-today', title: '오늘의 업무 대화', sub: 'Agent 브리핑 · 08:30', day: 0, msgs: [
      { who: 'ag', t: '08:30', tag: '담당 프로젝트 확인', kind: 'brief' },
    ] },
    { id: 't-os', title: '외주비가 왜 늘었어?', sub: '목업용 외주비 4분기 견적 분석', day: 1, msgs: [
      { who: 'me', t: '16:20', html: '목업용 외주비가 왜 늘었어?' },
      { who: 'ag', t: '16:20', tag: mock + ' · 외주비', kind: 'html', html: hagOsWhyHtml() },
    ] },
    { id: 't-exp', title: '경비 300만원 줄여줘', sub: '목업용 경비 조정안 반영', day: 1, msgs: [
      { who: 'me', t: '17:50', html: '목업용 경비 300만원 줄여줘' },
      { who: 'ag', t: '17:52', tag: mock, kind: 'html', html: '<p class="hag-p">경비 3,000,000원을 줄인 조정안을 반영했습니다. 원가조정 [예산 조정안]에서 결재 상신하시면 됩니다.</p>'
        + '<div class="hag-done"><b>✓ 반영 완료</b><span>· 경비 −3,000,000원</span><button type="button" onclick="hagGoAdjust()">조정안 보기 ›</button></div>' },
    ] },
    { id: 't-new', title: '차세대 여신심사 편성 시작', sub: hagShortDate(hagDay(5)) + ' · CP 상세정보 확인', day: 5, msgs: [
      { who: 'me', t: '10:05', html: '차세대 여신심사 편성 시작할게' },
      { who: 'ag', t: '10:05', tag: '차세대 여신심사 · 원가조정', kind: 'html', html: '<p class="hag-p"><b>CP 상세정보</b>를 확인했습니다. 인력 · 견적이 확정되어 인건비 · 외주비 · 재료비 · 경비 4개 계정 편성 초안을 만들어 두었습니다.</p>'
        + '<div class="hag-acts"><button type="button" class="hag-btn" onclick="hagGoAdjust()">원가조정 화면에서 보기 ›</button></div>' },
    ] },
    { id: 't-risk', title: '이상징후 있어?', sub: hagShortDate(hagDay(6)) + ' · 3건 확인', day: 6, msgs: [
      { who: 'me', t: '09:12', html: '이상징후 있어?' },
      { who: 'ag', t: '09:12', tag: '담당 프로젝트 전체', kind: 'html', html: hagRiskHtml() },
    ] },
    { id: 't-sign', title: '결재는 어디서 올려?', sub: hagShortDate(hagDay(7)) + ' · 원가조정 화면 안내', day: 7, msgs: [
      { who: 'me', t: '14:40', html: '결재는 어디서 올려?' },
      { who: 'ag', t: '14:40', tag: '화면 찾기', kind: 'html', html: hagSignHtml() },
    ] },
  ];
}
var hagThreads = (function () {
  try { const s = JSON.parse(localStorage.getItem(HAG_KEY) || 'null'); if (Array.isArray(s) && s.length) return s; } catch (e) { /* 처음 */ }
  return null;
})();
function hagData() { if (!hagThreads) hagThreads = hagSeed(); return hagThreads; }
function hagSave() { try { localStorage.setItem(HAG_KEY, JSON.stringify(hagThreads)); } catch (e) { /* 저장 막힘 */ } }
function hagThread(id) { return hagData().find(t => t.id === id) || null; }
function hagCurThread() { return hagThread(hagCur) || hagData()[0]; }

// ── 답 카드(목업) ────────────────────────────────────────────────────────────
function hagOsWhyHtml() {
  return '<p class="hag-lead">목업용 외주비는 4분기 확정 견적 3건(24,500,000원) 때문에 늘었습니다.</p>'
    + '<table class="hag-tbl"><thead><tr><th>업체</th><th>기간</th><th class="num">견적 금액</th></tr></thead><tbody>'
    + '<tr><td>아크로디자인랩</td><td>2026 Q4</td><td class="num">12,000,000</td></tr>'
    + '<tr><td>(주)인젠트</td><td>2026-10</td><td class="num">8,000,000</td></tr>'
    + '<tr><td>펜타시스템테크놀러지(주)</td><td>2026-11</td><td class="num">4,500,000</td></tr>'
    + '</tbody><tfoot><tr><td>합계</td><td></td><td class="num">24,500,000</td></tr></tfoot></table>'
    + '<p class="hag-why"><b>왜 문제인가요?</b> 지금 외주비 예산으로는 4,500,000원이 모자랍니다. 재료비 여유분을 옮기는 조정안을 만들어 두었습니다.</p>';
}
function hagRiskHtml() {
  return '<p class="hag-lead">이상징후 3건이 있습니다.</p><ol class="hag-list">'
    + '<li><b>예산관리시스템 목업용</b> 외주비가 종료 시점에 CP 한도를 넘을 수 있습니다.<small>4분기 견적 3건 반영 시 4,500,000원 부족</small></li>'
    + '<li><b>예산관리시스템 목업용</b> 경비 10월 집행이 계획보다 18% 많습니다.<small>회의비 · 출장비 증가</small></li>'
    + '<li><b>스마트팩토리 MES</b> 인건비 집행이 계획보다 4.2% 빠릅니다.<small>12월 투입 인력 종료일 확인 필요</small></li></ol>';
}
function hagSignHtml() {
  return '<p class="hag-p">결재 상신은 <b>원가조정</b> 화면에서 합니다. 프로젝트를 열고 위쪽 <b>[예산 조정안]</b>에서 반영한 조정안을 확인한 뒤 <b>[결재 상신]</b>을 누르면 됩니다.</p>'
    + '<div class="hag-acts"><button type="button" class="hag-btn" onclick="hagGoAdjust()">원가조정 화면 열기 ›</button></div>';
}
function hagTodoHtml() {
  return '<p class="hag-lead">오늘 처리할 일 12건 중 먼저 보실 4건입니다.</p><ol class="hag-list">'
    + '<li><b>예산관리시스템 목업용</b> 외주비 조정안 확인 · 결재 상신<small>CP 한도 초과 예상</small></li>'
    + '<li><b>차세대 여신심사</b> 편성 초안 검토<small>4개 계정 초안 준비됨</small></li>'
    + '<li><b>스마트팩토리 MES</b> 12월 투입 인력 종료일 확인<small>인건비 집행 4.2% 빠름</small></li>'
    + '<li><b>AI 문서심사</b> 10월 실적 확인<small>마감 반영 완료</small></li></ol>';
}
function hagMatLeftHtml() {
  return '<p class="hag-lead">목업용 재료비 남은 구매 계획입니다.</p>'
    + '<table class="hag-tbl"><thead><tr><th>품목</th><th>검수 주기</th><th class="num">남은 계획</th></tr></thead><tbody>'
    + '<tr><td>개발/운영 서버 라이선스</td><td>분기별</td><td class="num">39,000,000</td></tr>'
    + '<tr><td>테스트 자동화 도구</td><td>일괄</td><td class="num">3,000,000</td></tr>'
    + '</tbody><tfoot><tr><td>합계</td><td></td><td class="num">42,000,000</td></tr></tfoot></table>'
    + '<p class="hag-why">남은 계획을 빼도 재료비에 10,000,000원 여유가 있습니다.</p>';
}
function hagAdjHtml(amt, applied) {
  const f = n => (typeof fmt === 'function' ? fmt(n) : String(n));
  const os = 30500000, mt = 52000000;
  return '<p class="hag-lead">재료비 ' + f(amt) + '원을 외주비로 옮기는 조정안입니다. 총액은 변하지 않습니다.</p>'
    + '<table class="hag-tbl"><thead><tr><th>계정</th><th class="num">지금 예산</th><th class="num">조정</th><th class="num">조정 후</th></tr></thead><tbody>'
    + '<tr><td><span class="hag-acc">외주비</span></td><td class="num">' + f(os) + '</td><td class="num up">+' + f(amt) + '</td><td class="num">' + f(os + amt) + '</td></tr>'
    + '<tr><td><span class="hag-acc">재료비</span></td><td class="num">' + f(mt) + '</td><td class="num down">−' + f(amt) + '</td><td class="num">' + f(mt - amt) + '</td></tr>'
    + '</tbody><tfoot><tr><td>합계</td><td class="num">' + f(os + mt) + '</td><td class="num">0</td><td class="num">' + f(os + mt) + '</td></tr></tfoot></table>'
    + '<p class="hag-why"><b>왜 필요한가요?</b> 4분기 확정 견적 3건(24,500,000원)대로 계약하려면 외주비가 4,500,000원 모자랍니다. 재료비는 남은 구매 계획을 빼고도 10,000,000원 여유가 있습니다.</p>'
    + (applied
      ? '<div class="hag-done"><b>✓ 반영 완료</b><span>· 외주비 +' + f(amt) + ' · 재료비 −' + f(amt) + '</span><button type="button" onclick="hagGoAdjust()">조정안 보기 ›</button></div>'
      : '<div class="hag-acts"><button type="button" class="hag-btn pri" onclick="hagApply(this)">이대로 반영</button>'
        + '<button type="button" class="hag-btn" onclick="hagSend(\'4,500,000원만 옮겨줘\')">금액 바꿔서 반영</button>'
        + '<a class="hag-link" href="javascript:void(0)" onclick="hagGoAdjust()">원가조정 화면에서 보기 ›</a></div>');
}
// 질문 → 답 { tag, html, adj, chips }
function hagAnswer(q) {
  const s = String(q || '');
  const mock = '예산관리시스템 목업용';
  if (/4,?500,?000|450만/.test(s) && /옮|반영/.test(s)) return { tag: mock + ' · 원가조정', adj: 4500000, chips: ['재료비 남은 계획 보여줘', '다음 할 일'] };
  if (/조정안/.test(s) || /^1번/.test(s)) return { tag: mock + ' · 원가조정', adj: 10000000, chips: ['4,500,000원만 옮겨줘', '재료비 남은 계획 보여줘', '다음 할 일'] };
  if (/외주비/.test(s) && /(왜|늘|증가)/.test(s)) return { tag: mock + ' · 외주비', html: hagOsWhyHtml(), chips: ['1번 조정안 보여줘', '이상징후 더 있어?'] };
  if (/이상\s*징후|위험/.test(s)) return { tag: '담당 프로젝트 전체', html: hagRiskHtml(), chips: ['1번 조정안 보여줘', '오늘 할 일 알려줘'] };
  if (/결재|상신/.test(s)) return { tag: '화면 찾기', html: hagSignHtml(), chips: ['1번 조정안 보여줘'] };
  if (/할\s*일|다음/.test(s)) return { tag: '담당 프로젝트 전체', html: hagTodoHtml(), chips: ['1번 조정안 보여줘', '이상징후 있어?'] };
  if (/재료비/.test(s) && /(남은|계획)/.test(s)) return { tag: mock + ' · 재료비', html: hagMatLeftHtml(), chips: ['1번 조정안 보여줘'] };
  if (/(경비|인건비|외주비|재료비).*(줄|늘|빼|더)/.test(s)) return { tag: mock + ' · 원가조정', html: '<p class="hag-p">말씀하신 조정은 <b>원가조정</b> 화면의 Agent가 계정별 근거를 확인해 조정안으로 만들어 드립니다.</p>'
    + '<div class="hag-acts"><button type="button" class="hag-btn" onclick="hagGoAdjust()">원가조정 화면에서 이어가기 ›</button></div>', chips: ['이상징후 있어?'] };
  return { tag: '안내', html: '<p class="hag-p">지금은 시안이라 정해진 질문에만 답할 수 있어요. 아래처럼 물어보시면 바로 보여 드립니다.</p>', chips: ['오늘 할 일 알려줘', '목업용 외주비 왜 늘었어?', '이상징후 있어?', '결재는 어디서 올려?'] };
}

// ── 메시지 그리기 ────────────────────────────────────────────────────────────
function hagChips(list, lead) {
  if (!list || !list.length) return '';
  return '<div class="hag-chips"><span>' + hagEsc(lead || '이어서') + '</span>'
    + list.map(c => '<button type="button" onclick="hagSend(\'' + hagEsc(c).replace(/'/g, '') + '\')">' + hagEsc(c) + '</button>').join('') + '</div>';
}
function hagBriefHtml() {
  return '<p class="hag-lead">' + hagEsc(hagUserName()) + ' PM님, 오늘 먼저 보실 게 3가지 있습니다.</p>'
    + '<p class="hag-stat">해야 할 일 <b>12</b>건<span>이상징후 <b class="red">3</b>건</span><span>결재 진행 중 <b>2</b>건</span></p>'
    + '<ol class="hag-brief">'
    + '<li><i>1</i><div><b>예산관리시스템 목업용</b> 외주비가 종료 시점에 CP 한도를 넘을 수 있습니다.<small>재료비 여유분을 외주비로 옮기는 조정안을 만들어 두었습니다.</small></div></li>'
    + '<li><i>2</i><div><b>차세대 여신심사</b>는 인력 · 견적이 확정되어 편성 초안이 준비됐습니다.<small>인건비 · 외주비 · 재료비 · 경비 4개 계정입니다.</small></div></li>'
    + '<li><i>3</i><div><b>스마트팩토리 MES</b> 인건비 집행이 계획보다 4.2% 빠릅니다.<small>12월 투입 인력의 종료일을 확인해 보시면 좋겠습니다.</small></div></li>'
    + '</ol>' + hagChips(['1번 조정안 보여줘', '목업용 외주비 왜 늘었어?', '이상징후 더 있어?', '결재는 어디서 올려?'], '이렇게 말씀해 보세요');
}
function hagWelcomeHtml() {
  const card = (t, d, c) => '<div class="hag-help"><b>' + t + '</b><p>' + d + '</p><button type="button" onclick="hagSend(\'' + c + '\')">' + c + '</button></div>';
  return '<p class="hag-lead">' + hagEsc(hagUserName()) + ' PM님, 반갑습니다. 담당 프로젝트 ' + (hagPjts().length || 4) + '개의 원가를 함께 보는 Agent입니다.</p>'
    + '<p class="hag-p">아래처럼 물어보시면 됩니다. 버튼을 누르셔도 되고, 편하게 글로 쓰셔도 됩니다.</p>'
    + '<h4 class="hag-h4">이런 일을 도와드려요</h4><div class="hag-helps">'
    + card('할 일 정리', '지금 처리해야 할 일 12건을 프로젝트별로 정리해 드려요', '오늘 할 일 알려줘')
    + card('숫자 원인 분석', '예산 · 실적이 왜 바뀌었는지 근거와 함께 설명해 드려요', '목업용 외주비 왜 늘었어?')
    + card('이상징후 확인', '한도 초과, 잔액 소진처럼 놓치기 쉬운 것을 먼저 알려 드려요', '이상징후 있어?')
    + card('화면 찾기', '어느 메뉴에서 어떻게 하는지 안내하고 바로 열어 드려요', '결재는 어디서 올려?')
    + '</div><p class="hag-note">매일 아침 먼저 보실 일을 골라 이 자리에서 알려 드립니다.</p>';
}
function hagMsgBody(m, i) {
  if (m.kind === 'brief') return hagBriefHtml();
  if (m.kind === 'welcome') return hagWelcomeHtml();
  if (m.adj) return hagAdjHtml(m.adj, m.applied).replace('onclick="hagApply(this)"', 'onclick="hagApply(' + i + ')"') + (m.applied ? '' : hagChips(m.chips));
  return (m.html || '') + hagChips(m.chips);
}
function hagMsgHtml(m, i, compact) {
  if (m.who === 'me') return '<div class="hag-me"><div class="hag-bubble">' + hagEsc(m.html) + '<time>' + hagEsc(m.t || '') + '</time></div></div>';
  if (m.kind === 'typing') return '<div class="hag-ag"><span class="hag-av">AG</span><div class="hag-col"><div class="hag-meta"><b>Agent</b></div><div class="hag-card hag-typing"><i></i><i></i><i></i></div></div></div>';
  return '<div class="hag-ag"><span class="hag-av">AG</span><div class="hag-col">'
    + '<div class="hag-meta"><b>Agent</b>' + (m.t ? '<span>' + hagEsc(m.t) + '</span>' : '') + (m.tag ? '<em>' + hagEsc(m.tag) + '</em>' : '') + '</div>'
    + '<div class="hag-card">' + (compact ? hagMsgBody(m, i).replace(/<div class="hag-(chips|acts)">[\s\S]*?<\/div>/g, '') : hagMsgBody(m, i)) + '</div></div></div>';
}
function hagMsgsHtml(th) {
  const msgs = th.msgs || [];
  const briefFold = msgs.length > 1 && msgs[0].kind === 'brief' && !hagBriefOpen;
  return msgs.map((m, i) => {
    if (i === 0 && m.kind === 'brief' && msgs.length > 1) {
      return '<div class="hag-fold"><button type="button" onclick="hagToggleBrief()">' + (briefFold ? '▲ 오늘 ' + hagEsc(m.t) + ' Agent 브리핑 (3가지) 다시 보기' : '▼ 브리핑 접기') + '</button></div>'
        + (briefFold ? '' : hagMsgHtml(m, i));
    }
    return hagMsgHtml(m, i);
  }).join('');
}

// ── 홈 화면 ──────────────────────────────────────────────────────────────────
// 대화 머리 — 제목 · 날짜 + (대화 기록을 접었을 때만) 오른쪽 [대화 기록] 펴기 버튼
function hagHeadInner(th) {
  return '<strong>' + hagEsc(th.id === 't-today' ? '오늘의 업무 대화' : th.title) + '</strong><span>'
    + hagEsc(hagDateLabel(hagDay(th.day))) + ' · 실적은 10월 마감(10.28)까지 반영</span>'
    + '<button type="button" class="hag-side-open" onclick="hagToggleSide(true)" title="대화 기록 펴기"><span class="hag-side-ic" aria-hidden="true"></span>대화 기록</button>';
}
function hagHomeHtml() {
  const th = hagCurThread();
  hagCur = th.id;
  const today = hagDay(0);
  const head = th.day === 0 ? (th.id === 't-today' ? '오늘의 업무 대화' : th.title) : th.title;
  const when = th.day === 0 ? hagDateLabel(today) : hagDateLabel(hagDay(th.day));
  return `
    <div class="hag ${hagSideOpen ? '' : 'side-off'}">
      <section class="hag-main">
        <header class="hag-head">${hagHeadInner(th)}</header>
        <div class="hag-scroll" id="hag-scroll"><div class="hag-msgs" id="hag-msgs">${hagMsgsHtml(th)}</div></div>
        <div class="hag-input">
          <div class="hag-box">
            <input id="hag-q" type="text" placeholder="버튼을 누르거나 편하게 말씀하세요  (예: 경비 300만원 줄여줘)" onkeydown="if(event.key==='Enter'&&!event.isComposing)hagSendInput()">
            <button type="button" onclick="hagSendInput()">보내기</button>
          </div>
          <p>반영한 내용은 원가조정의 [예산 조정안]에도 남습니다 · 결재 상신은 원가조정 화면에서 합니다</p>
        </div>
      </section>
      <aside class="hag-side" aria-label="대화 기록">
        <div class="hag-side-head">
          <strong>대화 기록</strong>
          <button type="button" class="hag-new" onclick="hagNew()">＋ 새 대화</button>
          <button type="button" class="hag-fold-btn" onclick="hagToggleSide(false)" title="대화 기록 접기" aria-label="대화 기록 접기"><span class="hag-side-ic" aria-hidden="true"></span></button>
        </div>
        <div class="hag-search"><input type="text" placeholder="대화 내용 검색" value="${hagEsc(hagQuery)}" oninput="hagSearch(this.value)"></div>
        <div class="hag-hist" id="hag-hist">${hagHistHtml('home')}</div>
      </aside>
    </div>
    <div class="hm-drawer-overlay" id="home-impact-drawer" onclick="if(event.target===this)closeImpactDrawer()"></div>
    <div class="hm-modal-overlay" id="home-pjt-modal" onclick="if(event.target===this)closeHomePjtModal()"></div>`;
}
// 대화 기록 목록 — where: 'home' | 'dd'(원가조정 드롭다운)
function hagHistHtml(where) {
  const q = where === 'home' ? hagQuery.trim() : '';
  const groups = [['오늘', t => t.day === 0], ['어제 · ' + (hagDay(1).getMonth() + 1) + '월 ' + hagDay(1).getDate() + '일', t => t.day === 1], ['지난주', t => t.day > 1]];
  const hit = t => !q || (t.title + ' ' + t.sub + ' ' + (t.msgs || []).map(m => String(m.html || '').replace(/<[^>]+>/g, '')).join(' ')).indexOf(q) >= 0;
  let html = '';
  groups.forEach(([label, fn]) => {
    const list = hagData().filter(t => fn(t) && hit(t));
    if (!list.length) return;
    html += '<div class="hag-hg">' + hagEsc(label) + '</div>' + list.map(t =>
      '<button type="button" class="hag-hi' + (where === 'home' && t.id === hagCur ? ' on' : '') + '" onclick="' + (where === 'home' ? 'hagOpen' : 'hagOpenInPanel') + '(\'' + t.id + '\')">'
      + '<b>' + hagEsc(t.title) + '</b><small>' + hagEsc(t.sub || '') + '</small></button>').join('');
  });
  return html || '<p class="hag-empty">' + (q ? '찾는 대화가 없습니다.' : '아직 대화가 없습니다.') + '</p>';
}
function hagPaint(keepScroll) {
  const main = document.getElementById('s-main');
  if (!main || !main.querySelector('.hag')) return;
  const th = hagCurThread();
  const box = document.getElementById('hag-msgs');
  if (box) box.innerHTML = hagMsgsHtml(th);
  const head = main.querySelector('.hag-head');
  if (head) head.innerHTML = hagHeadInner(th);
  const hist = document.getElementById('hag-hist');
  if (hist) hist.innerHTML = hagHistHtml('home');
  main.querySelector('.hag').classList.toggle('side-off', !hagSideOpen);
  const sc = document.getElementById('hag-scroll');
  if (sc && !keepScroll) sc.scrollTop = sc.scrollHeight;
}

// ── 동작 ─────────────────────────────────────────────────────────────────────
function hagSendInput() {                               // crud N — 입력창 [보내기] / Enter
  const inp = document.getElementById('hag-q');
  if (!inp) return;
  const v = inp.value.trim();
  if (!v) return;
  inp.value = '';
  hagSend(v);
}
function hagSend(text) {                                // crud N — 질문 보내기(버튼 · 입력) → Agent 답(목업)
  hagSendTo(hagCurThread(), text, function () { hagPaint(); });
}
// 대화 th 에 질문을 붙이고 답(목업)을 단다 — repaint: 홈(hagPaint) 또는 AI 창(hagPastPaint)
function hagSendTo(th, text, repaint) {
  if (!th) return;
  th.msgs = (th.msgs || []).filter(m => m.kind !== 'welcome');
  if (th.title === '새 대화') { th.title = text.length > 18 ? text.slice(0, 18) + '…' : text; }
  th.msgs.push({ who: 'me', t: hagNowT(), html: text });
  th.sub = text + ' · ' + hagNowT();
  if (th.day !== 0) { th.day = 0; }
  hagThreads = [th].concat(hagData().filter(t => t !== th));
  th.msgs.push({ kind: 'typing', who: 'ag' });
  hagBriefOpen = false;
  repaint();
  setTimeout(function () {
    th.msgs = th.msgs.filter(m => m.kind !== 'typing');
    const a = hagAnswer(text);
    th.msgs.push({ who: 'ag', t: hagNowT(), tag: a.tag, kind: 'html', html: a.html || '', adj: a.adj || 0, chips: a.chips || [] });
    hagSave();
    repaint();
  }, 520);
}
function hagApply(i) {                                  // crud U — 조정안 [이대로 반영](목업: 반영 완료 표시)
  hagApplyTo(hagCurThread(), i, function () { hagPaint(); });
}
function hagApplyTo(th, i, repaint) {
  const m = th && th.msgs[i];
  if (!m || !m.adj) return;
  m.applied = true;
  m.chips = [];
  th.msgs.push({ who: 'ag', t: hagNowT(), tag: '예산관리시스템 목업용', kind: 'html',
    html: '<p class="hag-p">조정안을 반영했습니다. 원가조정 [예산 조정안]에서 결재 상신하시면 됩니다.</p>', chips: ['결재는 어디서 올려?', '다음 할 일'] });
  hagSave();
  repaint();
  if (typeof showToast === 'function') showToast('조정안을 반영했습니다. 원가조정 [예산 조정안]에 남았습니다.');
}
function hagNew() {                                     // crud C — [+ 새 대화]
  const id = 't-' + Date.now().toString(36);
  hagThreads = [{ id, title: '새 대화', sub: '방금 · ' + hagNowT(), day: 0, msgs: [{ who: 'ag', t: hagNowT(), kind: 'welcome', tag: '처음 화면' }] }].concat(hagData());
  hagCur = id;
  hagSave();
  hagPaint();
  const inp = document.getElementById('hag-q');
  if (inp) inp.focus();
}
function hagOpen(id) {                                  // crud R — 대화 기록 고르기 → 가운데에 그 대화
  if (!hagThread(id)) return;
  hagCur = id;
  hagBriefOpen = false;
  hagPaint();
}
function hagToggleBrief() {                             // crud N — 오늘 브리핑 다시 보기 / 접기
  hagBriefOpen = !hagBriefOpen;
  hagPaint(true);
}
function hagSearch(v) {                                 // crud R — 대화 내용 검색
  hagQuery = v || '';
  const hist = document.getElementById('hag-hist');
  if (hist) hist.innerHTML = hagHistHtml('home');
}
function hagToggleSide(open) {                          // crud N — 대화 기록 패널 접기 / 펴기
  hagSideOpen = !!open;
  try { localStorage.setItem(HAG_SIDE_KEY, hagSideOpen ? '1' : '0'); } catch (e) { /* 저장 막힘 */ }
  const h = document.querySelector('#s-main .hag');
  if (h) h.classList.toggle('side-off', !hagSideOpen);
}
function hagGoAdjust() {                                // crud N — 원가조정 화면으로
  if (typeof openCostAdjust === 'function') openCostAdjust(hagMockKey());
}

// 공유 셸의 홈 그리기를 바꿈(dashboard.js 가 renderHomeV2() 를 이름으로 부름)
window.renderHomeV2 = function () { return hagHomeHtml(); };

// ── 왼쪽 레일: 즐겨찾기 · 최근 본 화면 ───────────────────────────────────────
var HAG_MODE = { adjust: '원가조정', status: '원가현황', history: '원가이력' };
function hagDescView(label, desc) {
  desc = desc || {};
  if (desc.kind === 'budget') {
    const name = hagPjtName(desc.key) || String(label || '').replace(/^\S+-D\d+\s+/, '');
    return { title: desc.acct || HAG_MODE[desc.costMode] || '원가', sub: hagShortPjt(name) };
  }
  const parts = String(label || '').split(' · ');
  return { title: parts[0], sub: parts.slice(1).join(' · ') };
}
function hagFavList() {
  let list = (typeof favLoad === 'function') ? favLoad() : [];
  let seeded = false;
  try { seeded = localStorage.getItem('hag-fav-seeded') === '1'; } catch (e) { seeded = true; }
  if (!list.length && !seeded && typeof favSave === 'function') {
    const p = hagPjts();
    list = [
      { label: '원가조정', openDesc: { kind: 'budget', costMode: 'adjust', key: hagMockKey() } },
      { label: '원가현황', openDesc: { kind: 'budget', costMode: 'status', key: (p[2] && p[2].id) || 'smart' } },
      { label: '프로젝트 현황', openDesc: { kind: 'screen', screenId: 's-project-status' } },
      { label: '프로젝트 개설 관리', openDesc: { kind: 'screen', screenId: 's-project-open' } },
    ];
    favSave(list);
    try { localStorage.setItem('hag-fav-seeded', '1'); } catch (e) { /* 저장 막힘 */ }
  }
  return list;
}
function hagRecentList() {
  let list = null;
  try { list = JSON.parse(localStorage.getItem(HAG_RECENT_KEY) || 'null'); } catch (e) { list = null; }
  if (!Array.isArray(list)) {
    const p = hagPjts(), at = (off, h, m) => { const d = hagDay(off); d.setHours(h, m); return d.getTime(); };
    list = [
      { title: '경비', sub: hagShortPjt(hagPjtName(hagMockKey())), at: at(0, 8, 12), desc: { kind: 'budget', costMode: 'adjust', key: hagMockKey() } },
      { title: '재료비', sub: hagShortPjt((p[0] && p[0].name) || '차세대 여신심사'), at: at(1, 15, 30), desc: { kind: 'budget', costMode: 'adjust', key: (p[0] && p[0].id) || '' } },
      { title: '원가현황', sub: hagShortPjt((p[3] && p[3].name) || 'AI 문서심사'), at: at(4, 11, 0), desc: { kind: 'budget', costMode: 'status', key: (p[3] && p[3].id) || '' } },
    ];
  }
  return list;
}
function hagWhen(ms) {
  const d = new Date(ms), t0 = hagDay(0).getTime(), t1 = hagDay(1).getTime();
  if (ms >= t0) return hagPad(d.getHours()) + ':' + hagPad(d.getMinutes());
  if (ms >= t1) return '어제';
  return hagShortDate(d);
}
// ── 왼쪽 레일 — 원래 모양(.v2-sec 회색 머리글 + 흰 .v2-card) 그대로, 즐겨찾기 · 최근 본 화면 카드만 더함 ──
function hagRailRow(onclick, title, sub, right, tip) {
  return '<button type="button" class="hag-v2row" onclick="' + onclick + '" title="' + hagEsc(tip || (title + (sub ? ' · ' + sub : ''))) + '">'
    + '<span class="v2-row-t">' + hagEsc(title) + '</span>' + (sub ? '<small>' + hagEsc(sub) + '</small>' : '')
    + (right ? '<time>' + hagEsc(right) + '</time>' : '') + '</button>';
}
function hagRailSecsHtml() {
  const fav = hagFavList(), rec = HAG_RECENT_ON ? hagRecentList().slice(0, 5) : [];
  const star = (typeof V2_IC !== 'undefined' && V2_IC.star) || '';
  const clock = '<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 6v4.2l2.6 1.6"/></svg>';
  return '<div class="v2-sec hag-railsec"><i>' + star + '</i>즐겨찾기<em>' + fav.length + '</em><button type="button" class="hag-sec-act" onclick="openFavorites()">편집</button></div>'
    + '<div class="v2-card hag-railcard">' + (fav.length ? fav.slice(0, 6).map((f, i) => { const v = hagDescView(f.label, f.openDesc); return hagRailRow('favOpen(' + i + ')', v.title, v.sub, ''); }).join('')
      : '<div class="v2-empty">자주 보는 화면을 [편집]에서 추가해 두세요.</div>') + '</div>'
    + (!HAG_RECENT_ON ? '' : '<div class="v2-sec hag-railsec"><i>' + clock + '</i>최근 본 화면</div>'
    + '<div class="v2-card hag-railcard">' + (rec.length ? rec.map((r, i) => hagRailRow('hagRecentOpen(' + i + ')', r.title, r.sub, hagWhen(r.at))).join('')
      : '<div class="v2-empty">아직 본 화면이 없습니다.</div>') + '</div>');
}

// ── 담당 프로젝트 — 원래 카드 · 원래 행(dashboard.js:homeV2PjtRowHtml + rail-project-go.js) 그대로.
//   바꾼 것은 4가지뿐: ① 30개까지 대비해 먼저 5개 + [나머지 N개 보기](펼치면 이름 검색) ② 위 카드들과 같은 모양
//   ③ 펼치기 칸(▸)을 작게 ④ 줄 높이를 낮게. 펼친 내용(금액 · 해야 할 일 · 이상징후)은 원래 그대로.
//   시안: 목업 프로젝트에 이름만 있는 프로젝트를 더해 30개(목업 데이터가 없는 프로젝트는 펼치기 칸 없음 · 누르면 안내).
var HAG_PJT_TOTAL = 30, HAG_PJT_TOP = 5;
var HAG_PJT_EXTRA = ['그룹웨어 고도화', '차세대 정산 시스템 구축', '고객센터 상담 시스템 전환', '전자결재 모바일 확장', '물류 창고관리(WMS) 구축',
  '인사 시스템 클라우드 전환', '빅데이터 분석 플랫폼', '영업관리 CRM 고도화', '설비 예지보전 POC', '통합 인증(SSO) 구축', '사내 포털 리뉴얼',
  '보안 취약점 점검 체계', '데이터 품질관리 시스템', '구매 시스템 고도화', '전사 ITSM 운영', '차세대 회계 시스템', 'IoT 관제 대시보드'];
var hagPjtAll = false, hagPjtQ = '';
function hagPjtRows() {
  const card = hagPjts();
  const seen = {}, rows = [];
  const add = (id, name) => { if (seen[id]) return; seen[id] = 1; rows.push({ id, name }); };
  card.forEach(p => add(p.id, p.name));
  ((typeof HOME_PROJECTS !== 'undefined') ? HOME_PROJECTS : []).forEach(p => add(p.id, p.name));
  HAG_PJT_EXTRA.forEach((n, i) => { if (rows.length < HAG_PJT_TOTAL) add('hag-x' + i, n); });
  return rows.map(r => Object.assign(r, { live: (typeof BUDGET_SOURCE !== 'undefined' && !!BUDGET_SOURCE[r.id]) || card.some(c => c.id === r.id) }));
}
function hagPjtRowHtml(r) {
  if (r.live && typeof homeV2PjtRowHtml === 'function') {
    try { return homeV2PjtRowHtml({ id: r.id, name: r.name }); } catch (e) { /* 아래 빈 행 */ }
  }
  const arrow = (typeof RPG_ARROW !== 'undefined') ? RPG_ARROW : '';
  return '<div class="v2-pjt"><div class="v2-pjt-h rpg-h"><span class="rpg-tog off" aria-hidden="true"></span>'
    + '<button class="rpg-go" onclick="hagPjtGo(\'' + hagEsc(r.id) + '\')" title="프로젝트로 이동"><span class="v2-row-t">' + hagEsc(r.name) + '</span>'
    + '<span class="rpg-arr">' + arrow + '</span></button></div></div>';
}
function hagPjtRowsHtml() {
  const rows = hagPjtRows(), q = hagPjtQ.trim();
  const list = !hagPjtAll ? rows.slice(0, HAG_PJT_TOP) : (q ? rows.filter(r => r.name.indexOf(q) >= 0) : rows);
  return list.length ? list.map(hagPjtRowHtml).join('') : '<div class="v2-empty">찾는 프로젝트가 없습니다.</div>';
}
// 원래 목록 함수를 바꿔 끼움 — 레일을 그릴 때도, 원래 펼치기(toggleHomeV2Pjt)가 다시 그릴 때도 이 모양
window.homeV2PjtListHtml = function () {
  const rest = hagPjtRows().length - HAG_PJT_TOP;
  return (hagPjtAll ? '<div class="hag-pj-search"><input type="text" placeholder="프로젝트 이름 검색" value="' + hagEsc(hagPjtQ) + '" oninput="hagPjtSearch(this.value)"></div>' : '')
    + '<div id="hag-pj-list">' + hagPjtRowsHtml() + '</div>'
    + (rest > 0 ? '<button type="button" class="hag-pj-more" onclick="hagPjtToggle()">' + (hagPjtAll ? '접기 ▴' : '나머지 ' + rest + '개 보기 ▾') + '</button>' : '');
};
function hagPjtToggle() {                               // crud N — 담당 프로젝트 [나머지 N개 보기] / [접기]
  hagPjtAll = !hagPjtAll;
  if (!hagPjtAll) hagPjtQ = '';
  const el = document.getElementById('v2-rail-body');
  if (el) el.innerHTML = window.homeV2PjtListHtml();
  if (hagPjtAll) { const inp = document.querySelector('.hag-pj-search input'); if (inp) inp.focus(); }
}
function hagPjtSearch(v) {                              // crud R — 담당 프로젝트 이름 검색
  hagPjtQ = v || '';
  const el = document.getElementById('hag-pj-list');
  if (el) el.innerHTML = hagPjtRowsHtml();
}
function hagPjtGo(id) {                                 // crud N — 목업 데이터가 없는 프로젝트(시안) 안내
  const r = hagPjtRows().find(x => x.id === id);
  if (!r || !r.live) { if (typeof showToast === 'function') showToast('시안이라 이 프로젝트는 목업 데이터가 없습니다.'); return; }
  if (typeof railPjtGo === 'function') railPjtGo(id);
}

// 왼쪽 레일 아래에서 잠깐 빼 둔 것(지운 것 아님 — false 로 바꾸면 다시 보임)
var HAG_RAIL_HIDE = { process: true, purchase: true };   // 업무 프로세스 · 구매시스템 참고
// [2026.11.26] 최근 본 화면 칸 뺌(사용자 요청, 지운 것 아님 — true 로 바꾸면 칸 · 기록 다시 켜짐)
var HAG_RECENT_ON = false;
function hagRecentOpen(i) {                             // crud N — 최근 본 화면 다시 열기
  const r = hagRecentList()[i];
  if (r && typeof window.tabReopen === 'function') window.tabReopen(r.desc);
}
(function () {
  const before = window.v2AppRailHtml;
  if (typeof before !== 'function') return;
  window.v2AppRailHtml = function () {
    let html = before.apply(this, arguments);
    html = html.replace('<div class="v2-rail-scroll">', '<div class="v2-rail-scroll">' + hagRailSecsHtml());
    html = html.replace(/((?:담당|팀) 프로젝트)<em>\d+<\/em>/, '$1<em>' + hagPjtRows().length + '</em>');
    html = html.replace(/<button onclick="openFavorites\(\)"[\s\S]*?<\/button>/, '');   // 아래 '즐겨찾기' 버튼은 위 칸으로
    // [2026.11.25] 잠깐 빼 둠(지운 것 아님) — HAG_RAIL_HIDE 값을 false 로 바꾸면 다시 보임
    if (HAG_RAIL_HIDE.process) html = html.replace(/<button class="v2-procbar"[\s\S]*?<\/button>/, '');
    if (HAG_RAIL_HIDE.purchase) html = html.replace(/<button onclick="openPurchaseReference\(\)"[\s\S]*?<\/button>/, '');
    return html;
  };
})();
function hagRemountRail() { try { if (typeof v2MountRail === 'function') v2MountRail(); } catch (e) { /* 무시 */ } }
// 즐겨찾기를 고치면 레일도 다시 그림
(function () {
  const before = window.favSave;
  if (typeof before !== 'function') return;
  window.favSave = function () { const r = before.apply(this, arguments); setTimeout(hagRemountRail, 0); return r; };
})();
// 화면 이동을 지켜보며 최근 본 화면 기록
function hagRecordRecent() {
  if (!HAG_RECENT_ON) return;
  const s = document.querySelector('.screen.active');
  if (!s || s.id === 's-main') return;
  const cur = (typeof window.tabCurrentDesc === 'function') ? window.tabCurrentDesc() : null;
  if (!cur) return;
  const desc = Object.assign({}, cur.openDesc || {});
  let v;
  if (s.id === 's-budget' && desc.kind === 'budget') {
    const acct = (typeof costMode !== 'undefined' && costMode === 'adjust' && typeof budgetSetupEditAccount !== 'undefined') ? budgetSetupEditAccount : '';
    if (acct) desc.acct = acct;
    v = hagDescView(cur.label, desc);
  } else {
    v = { title: cur.label || '화면', sub: '' };
  }
  const list = hagRecentList().filter(r => !(r.title === v.title && r.sub === v.sub));
  list.unshift({ title: v.title, sub: v.sub, at: Date.now(), desc });
  try { localStorage.setItem(HAG_RECENT_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) { /* 저장 막힘 */ }
  hagRemountRail();
}
(function hagWatch() {
  let t = null, last = '';
  const kick = function () {
    clearTimeout(t);
    t = setTimeout(function () {
      const s = document.querySelector('.screen.active');
      const key = (s ? s.id : '') + '|' + (location.hash || '') + '|' + ((typeof budgetSetupEditAccount !== 'undefined') ? budgetSetupEditAccount : '');
      if (key === last) return;
      last = key;
      hagRecordRecent();
      hagHistBtnPaint();
    }, 400);
  };
  function bind() {
    const content = document.querySelector('.content');
    if (!content) { setTimeout(bind, 300); return; }
    new MutationObserver(function (recs) {
      for (let i = 0; i < recs.length; i++) { const el = recs[i].target; if (el.classList && el.classList.contains('screen')) { kick(); return; } }
    }).observe(content, { attributes: true, attributeFilter: ['class'], subtree: true });
    window.addEventListener('hashchange', kick);
    window.addEventListener('resize', hagHistBtnPaint);
    hagRemountRail();
    hagHistBtnPaint();
    kick();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();

// ── 원가조정 등: AI 창(#dde-ai) 머리의 [⧉ 새 창] 아이콘 옆 문서 아이콘 → 대화 기록 드롭다운 ─────────
var HAG_DOC_IC = '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M5 2.8h6.6L15.4 6.6V17.2H5z"/><path d="M11.4 2.8v4h4"/><path d="M7.6 10h5M7.6 13h5"/></svg>';
function hagOnHome() { return !!document.querySelector('#s-main.active'); }
function hagHistIco() { return document.querySelector('#dde-ai .hag-hist-ico'); }
// AI 창 머리에 문서 아이콘을 넣고(한 번), 드롭다운이 열려 있으면 아이콘 아래로 위치를 맞춤
function hagHistBtnPaint() {
  const head = document.querySelector('#dde-ai .dde-ai-head');
  if (!head) return;
  let b = head.querySelector('.hag-hist-ico');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button';
    b.className = 'dde-ai-ico hag-hist-ico';
    b.title = '대화 기록';
    b.setAttribute('aria-label', '대화 기록');
    b.setAttribute('onpointerdown', 'event.stopPropagation()');   // 머리 끌기(창 옮기기)와 겹치지 않게
    b.setAttribute('onclick', 'hagHistToggle()');
    b.innerHTML = HAG_DOC_IC;
    head.insertBefore(b, head.querySelector('.dde-ai-pop'));
  }
  const dd = document.getElementById('hag-hist-dd');
  if (!dd) return;
  const r = b.getBoundingClientRect();
  if (!r.width) { hagHistToggle(false); return; }
  const w = dd.offsetWidth || 330;
  dd.style.top = Math.round(r.bottom + 6) + 'px';
  dd.style.left = Math.round(Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8)) + 'px';
}
function hagHistToggle(open) {                          // crud N — 문서 아이콘: 대화 기록 드롭다운 열기 / 닫기
  let dd = document.getElementById('hag-hist-dd');
  const b = hagHistIco();
  const want = (open === undefined) ? !dd : !!open;
  if (!want) { if (dd) dd.remove(); if (b) b.classList.remove('on'); return; }
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'hag-hist-dd';
    dd.setAttribute('role', 'dialog');
    dd.setAttribute('aria-label', '대화 기록');
    document.body.appendChild(dd);
  }
  dd.innerHTML = '<div class="hag-dd-head"><strong>대화 기록</strong><span>고르면 AI 창에서 열립니다</span></div>'
    + '<div class="hag-dd-list">' + hagHistHtml('dd') + '</div>'
    + '<button type="button" class="hag-dd-foot" onclick="hagHistToggle(false);hagGoHome()">홈에서 전체 대화 보기 ›</button>';
  if (b) b.classList.add('on');
  hagHistBtnPaint();
}
document.addEventListener('mousedown', function (e) {
  const dd = document.getElementById('hag-hist-dd');
  if (!dd) return;
  if (dd.contains(e.target) || (e.target.closest && e.target.closest('.hag-hist-ico'))) return;
  hagHistToggle(false);
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hagHistToggle(false); });
function hagGoHome() { if (typeof showMain === 'function') showMain(); }
// 기록 하나 → AI 창 안에 그 대화를 펼치고, 아래 입력창으로 그 대화에 바로 이어서 묻기
var hagPastId = '';
function hagOpenInPanel(id) {                           // crud R — 드롭다운에서 고른 대화를 AI 창에서 보기
  hagHistToggle(false);
  if (!hagThread(id)) return;
  if (typeof ddeAiToggle === 'function' && !(typeof ddeAi !== 'undefined' && ddeAi.open)) ddeAiToggle(true);
  hagPastId = id;
  hagPastPaint();
  const inp = document.getElementById('hag-past-q');
  if (inp) try { inp.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
}
function hagPastPaint() {
  const th = hagThread(hagPastId);
  const p = document.getElementById('dde-ai');
  if (!th || !p) return;
  let v = p.querySelector('.hag-past');
  if (!v) {
    v = document.createElement('div');
    v.className = 'hag-past';
    v.innerHTML = '<div class="hag-past-head"></div><div class="hag-past-body"></div>'
      + '<div class="hag-past-foot"><div class="hag-box"><input id="hag-past-q" type="text" placeholder="이 대화에 이어서 물어보세요"'
      + ' onkeydown="if(event.key===\'Enter\'&&!event.isComposing)hagPastSendInput()"><button type="button" onclick="hagPastSendInput()">보내기</button></div></div>';
    p.appendChild(v);
  }
  v.querySelector('.hag-past-head').innerHTML = '<button type="button" onclick="hagPastClose()">← 지금 대화로</button>'
    + '<div><strong>' + hagEsc(th.id === 't-today' ? '오늘의 업무 대화' : th.title) + '</strong><span>' + hagEsc(hagDateLabel(hagDay(th.day))) + '</span></div>';
  // 홈과 같은 카드를 쓰되, 버튼은 이 대화(AI 창)에 붙도록 바꿈
  const body = v.querySelector('.hag-past-body');
  body.innerHTML = (th.msgs || []).map((m, i) => hagMsgHtml(m, i))
    .join('').replace(/hagSend\(/g, 'hagPastSend(').replace(/hagApply\(/g, 'hagPastApply(');
  body.scrollTop = body.scrollHeight;
}
function hagPastSendInput() {                           // crud N — AI 창 지난 대화 아래 입력창 [보내기] / Enter
  const inp = document.getElementById('hag-past-q');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;
  inp.value = '';
  hagPastSend(val);
}
function hagPastSend(text) {                            // crud N — 지난 대화에 이어서 묻기(AI 창 안에서)
  hagSendTo(hagThread(hagPastId), text, hagPastPaint);
}
function hagPastApply(i) {                              // crud U — AI 창 안 조정안 [이대로 반영]
  hagApplyTo(hagThread(hagPastId), i, hagPastPaint);
}
function hagPastClose() {                               // crud N — AI 창의 지난 대화 닫기(지금 대화로)
  hagPastId = '';
  const v = document.querySelector('#dde-ai .hag-past');
  if (v) v.remove();
}
// AI 창을 다시 그릴 때 문서 아이콘 위치도 맞춤
(function () {
  const before = window.ddeAiPaint;
  if (typeof before !== 'function') return;
  window.ddeAiPaint = function () { const r = before.apply(this, arguments); try { hagHistBtnPaint(); } catch (e) { /* 무시 */ } return r; };
})();

// ── 스타일 ───────────────────────────────────────────────────────────────────
(function hagStyle() {
  if (typeof document === 'undefined' || document.getElementById('hag-style')) return;
  const st = document.createElement('style');
  st.id = 'hag-style';
  st.textContent = `
  /* 홈에서는 AI 버튼 · AI 창(문서 아이콘 포함)을 숨김(홈이 곧 대화 화면) */
  body:has(#s-main.active) #dde-ai-btn, body:has(#s-main.active) #dde-ai, body:has(#s-main.active) #hag-hist-dd { display:none !important; }
  body:has(#s-main.active).dde-ai-dock .main .content { margin-right:0 !important; }

  /* 화면 탭 줄(app-tabs.js) 배경이 베이지(#f2f2ee)라 바깥 회청색 배경과 뚝 끊겨 보임 → 바깥 배경을 그대로 비치게(공유 파일은 그대로) */
  body.app-v2 .app-tabbar { background:transparent !important; }
  #s-main:has(.hag) { padding:0 !important; }
  .hag, .hag-past, #hag-hist-dd { --hag-navy:#1F4E8C; --hag-navy-bg:#EEF3FA; --hag-line:#E2E5EA; --hag-t1:#1c2432; --hag-t2:#4b5563; --hag-t3:#6b7280; }
  .hag { position:relative; display:grid; grid-template-columns:minmax(0,1fr) 300px; height:calc(100vh - 74px); min-height:520px;
    background:transparent; color:var(--hag-t1); font-size:15px; }   /* 원래 홈 카드 배경(위 흰색 → 아래 옅은 파랑)이 그대로 보이게 */
  .hag.side-off { grid-template-columns:minmax(0,1fr) 0; }
  .hag-main { display:flex; flex-direction:column; min-width:0; min-height:0; }
  .hag-head { display:flex; align-items:baseline; gap:10px; margin:0 auto; width:min(840px,calc(100% - 48px)); padding:18px 0 14px; border-bottom:1px solid var(--hag-line); }
  .hag-head strong { font-size:18px; font-weight:800; }
  .hag-head span { font-size:14px; color:var(--hag-t3); }
  .hag-scroll { flex:1; min-height:0; overflow:auto; }
  .hag-msgs { width:min(840px,calc(100% - 48px)); margin:0 auto; padding:22px 0 18px; display:flex; flex-direction:column; gap:20px; }
  .hag-ag { display:flex; gap:12px; align-items:flex-start; }
  .hag-av { flex:none; width:34px; height:34px; border-radius:8px; background:var(--hag-navy); color:#fff; font-size:12.5px; font-weight:800;
    display:flex; align-items:center; justify-content:center; }
  .hag-col { flex:1; min-width:0; }
  .hag-meta { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13.5px; color:var(--hag-t3); }
  .hag-meta b { color:var(--hag-navy); font-weight:800; }
  .hag-meta em { font-style:normal; padding:1px 8px; border-radius:5px; background:#f1f3f6; color:var(--hag-t2); font-size:12.5px; }
  .hag-card { border:1px solid var(--hag-line); border-radius:12px; padding:18px 20px; background:#fff; }
  .hag-lead { font-size:16.5px; font-weight:800; margin-bottom:10px; line-height:1.5; }
  .hag-p { font-size:15.5px; line-height:1.65; color:var(--hag-t1); }
  .hag-p + .hag-p { margin-top:6px; }
  .hag-stat { font-size:14.5px; color:var(--hag-t2); margin-bottom:12px; }
  .hag-stat span { margin-left:16px; }
  .hag-stat b { font-size:17px; color:var(--hag-t1); }
  .hag-stat b.red { color:#c0392b; }
  .hag-brief { list-style:none; border:1px solid var(--hag-line); border-radius:10px; }
  .hag-brief li { display:flex; gap:14px; align-items:flex-start; padding:15px 18px; }
  .hag-brief li + li { border-top:1px solid #eef0f3; }
  .hag-brief i { flex:none; width:26px; height:26px; margin-top:2px; border-radius:50%; background:var(--hag-navy); color:#fff; font-style:normal;
    font-size:13.5px; font-weight:800; display:flex; align-items:center; justify-content:center; }
  .hag-brief div { font-size:15.5px; line-height:1.5; }
  .hag-brief small, .hag-list small { display:block; margin-top:3px; font-size:13.5px; color:var(--hag-t3); }
  .hag-list { padding-left:22px; display:flex; flex-direction:column; gap:10px; font-size:15.5px; line-height:1.5; }
  .hag-tbl { width:100%; border-collapse:collapse; margin:4px 0 12px; font-size:15px; border:1px solid var(--hag-line); }
  .hag-tbl th { padding:10px 14px; background:#f6f7f9; color:var(--hag-t2); font-size:13.5px; font-weight:700; text-align:left; border-bottom:1px solid var(--hag-line); }
  .hag-tbl td { padding:12px 14px; border-bottom:1px solid #eef0f3 !important; }
  .hag-tbl tfoot td { font-weight:800; border-bottom:0 !important; border-top:1px solid var(--hag-line) !important; }
  .hag-tbl .num { text-align:right; font-variant-numeric:tabular-nums; }
  .hag-tbl .up { color:#1d5bd8; font-weight:800; }
  .hag-tbl .down { color:#c0392b; font-weight:800; }
  .hag-acc { display:inline-block; padding:2px 10px; border-radius:5px; background:#f1f3f6; font-size:13px; font-weight:700; color:var(--hag-t2); }
  .hag-why { padding:12px 14px; border-radius:8px; background:#f6f7f9; font-size:14.5px; line-height:1.6; color:var(--hag-t2); }
  .hag-why b { color:var(--hag-t1); }
  .hag-acts { display:flex; align-items:center; gap:8px; margin-top:14px; }
  .hag-btn { height:38px; padding:0 16px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; color:var(--hag-t1); font:inherit;
    font-size:14.5px; font-weight:700; cursor:pointer; }
  .hag-btn:hover { background:#f8fafc; border-color:#94a3b8; }
  .hag-btn.pri { background:var(--hag-navy); border-color:var(--hag-navy); color:#fff; }
  .hag-btn.pri:hover { background:#173d6f; }
  .hag-link { margin-left:auto; font-size:14px; color:var(--hag-t2); text-decoration:underline; text-underline-offset:3px; }
  .hag-done { display:flex; align-items:center; gap:8px; margin-top:12px; padding:11px 14px; border:1px solid #cfe5d6; border-radius:8px; background:#f2f8f4; font-size:14.5px; }
  .hag-done b { color:#2e7d4f; }
  .hag-done span { color:var(--hag-t2); }
  .hag-done button { margin-left:auto; border:0; background:none; color:var(--hag-t2); font:inherit; font-size:14px; text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
  .hag-chips { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:14px; }
  .hag-chips > span { font-size:13.5px; color:var(--hag-t3); margin-right:2px; }
  .hag-chips button { height:34px; padding:0 14px; border:1px solid #c9d7ea; border-radius:17px; background:var(--hag-navy-bg); color:var(--hag-navy);
    font:inherit; font-size:14.5px; font-weight:700; cursor:pointer; }
  .hag-chips button:hover { background:#e2ebf7; }
  .hag-h4 { margin:16px 0 10px; font-size:16px; font-weight:800; }
  .hag-helps { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .hag-help { border:1px solid var(--hag-line); border-radius:10px; padding:14px 16px; }
  .hag-help b { font-size:15.5px; }
  .hag-help p { margin:4px 0 10px; font-size:14px; color:var(--hag-t2); line-height:1.5; }
  .hag-help button { height:32px; padding:0 12px; border:1px solid #c9d7ea; border-radius:16px; background:var(--hag-navy-bg); color:var(--hag-navy);
    font:inherit; font-size:14px; font-weight:700; cursor:pointer; }
  .hag-note { margin-top:12px; font-size:14px; color:var(--hag-t2); }
  .hag-me { display:flex; justify-content:flex-end; }
  .hag-bubble { max-width:70%; padding:12px 16px; border-radius:12px 12px 4px 12px; background:var(--hag-navy); color:#fff; font-size:15.5px; line-height:1.5; }
  .hag-bubble time { display:block; margin-top:4px; text-align:right; font-size:12px; opacity:.8; }
  .hag-fold { text-align:center; }
  .hag-fold button { height:32px; padding:0 14px; border:1px solid var(--hag-line); border-radius:16px; background:#fff; color:var(--hag-t2);
    font:inherit; font-size:13.5px; cursor:pointer; }
  .hag-fold button:hover { background:#f8fafc; }
  .hag-typing { display:inline-flex; gap:5px; padding:14px 18px; }
  .hag-typing i { width:7px; height:7px; border-radius:50%; background:#9aa3af; animation:hagDot 1s infinite; }
  .hag-typing i:nth-child(2) { animation-delay:.15s; } .hag-typing i:nth-child(3) { animation-delay:.3s; }
  @keyframes hagDot { 0%,80%,100% { opacity:.3 } 40% { opacity:1 } }
  .hag-input { width:min(840px,calc(100% - 48px)); margin:0 auto; padding:12px 0 14px; border-top:1px solid var(--hag-line); }
  .hag-box { display:flex; align-items:center; gap:8px; padding:6px 6px 6px 16px; border:1px solid #cbd5e1; border-radius:12px; background:#fff; }
  .hag-box:focus-within { border-color:var(--hag-navy); box-shadow:0 0 0 3px rgba(31,78,140,.12); }
  .hag-box input { flex:1; min-width:0; height:40px; border:0; outline:0; font:inherit; font-size:15.5px; color:var(--hag-t1); background:transparent; }
  .hag-box button { height:40px; padding:0 20px; border:0; border-radius:9px; background:var(--hag-navy); color:#fff; font:inherit; font-size:15px; font-weight:800; cursor:pointer; }
  .hag-input p { margin-top:8px; text-align:center; font-size:13px; color:var(--hag-t3); }
  /* 오른쪽 대화 기록 */
  .hag-side { min-width:0; overflow:hidden; display:flex; flex-direction:column; border-left:1px solid var(--hag-line); background:transparent; }
  .hag.side-off .hag-side { border-left:0; }
  .hag-side-head { display:flex; align-items:center; gap:8px; padding:16px 16px 12px 18px; border-bottom:1px solid var(--hag-line); }
  .hag-side-head strong { font-size:16px; font-weight:800; margin-right:auto; white-space:nowrap; }
  .hag-new { height:34px; padding:0 12px; border:1px solid var(--hag-navy); border-radius:8px; background:#fff; color:var(--hag-navy); font:inherit;
    font-size:14px; font-weight:700; cursor:pointer; white-space:nowrap; }
  .hag-new:hover { background:var(--hag-navy-bg); }
  .hag-fold-btn { width:30px; height:34px; border:0; border-radius:8px; background:none; color:var(--hag-t2); font-size:18px; cursor:pointer; }
  .hag-fold-btn:hover { background:#f1f3f6; }
  .hag-search { padding:12px 16px 4px; }
  .hag-search input { width:100%; height:38px; padding:0 12px; border:1px solid #d5dae1; border-radius:8px; font:inherit; font-size:14.5px; outline:0; }
  .hag-search input:focus { border-color:var(--hag-navy); }
  .hag-hist { flex:1; overflow:auto; padding:4px 0 16px; }
  .hag-hg { padding:14px 18px 6px; font-size:13px; font-weight:700; color:var(--hag-t3); }
  .hag-hi { display:block; width:100%; padding:9px 18px; border:0; border-left:3px solid transparent; background:none; text-align:left; font:inherit; cursor:pointer; }
  .hag-hi:hover { background:#f6f7f9; }
  .hag-hi.on { background:var(--hag-navy-bg); border-left-color:var(--hag-navy); }
  .hag-hi b { display:block; font-size:15px; font-weight:700; color:var(--hag-t1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .hag-hi small { display:block; margin-top:2px; font-size:13px; color:var(--hag-t3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .hag-empty { padding:24px 18px; font-size:14px; color:var(--hag-t3); text-align:center; }
  /* 접기 · 펴기 아이콘 — 왼쪽 레일 접기 버튼(.v2-collapse-ic)과 같은 모양, 채운 칸만 오른쪽(대화 기록 쪽) */
  .hag-side-ic { position:relative; display:block; width:15px; height:13px; border:1.6px solid #aab4c4; border-radius:3px; transition:border-color .2s; }
  .hag-side-ic::before { content:''; position:absolute; top:0; bottom:0; right:0; width:5px; background:#aab4c4; border-radius:0 1.5px 1.5px 0; transition:background .2s; }
  .hag-fold-btn { display:inline-flex; align-items:center; justify-content:center; font-size:0; }
  .hag-fold-btn:hover .hag-side-ic, .hag-side-open:hover .hag-side-ic { border-color:#2f6bed; }
  .hag-fold-btn:hover .hag-side-ic::before, .hag-side-open:hover .hag-side-ic::before { background:#2f6bed; }
  /* 접힌 뒤 — 대화 머리 오른쪽에 [아이콘 대화 기록] 한 줄 버튼(세로 글자 탭 대신) */
  .hag-side-open { display:none; margin-left:auto; align-self:center; align-items:center; gap:7px; height:32px; padding:0 12px;
    border:1px solid var(--hag-line); border-radius:8px; background:#fff; color:var(--hag-t2); font:inherit; font-size:14px; font-weight:700; cursor:pointer; }
  .hag-side-open:hover { color:#1c2432; background:#f8fafc; }
  .hag.side-off .hag-side-open { display:inline-flex; }
  /* 왼쪽 레일 — 원래 모양 그대로. 즐겨찾기 · 최근 본 화면 행은 원래 행 글씨(.v2-row-t) · 원래 hover 색 */
  .v2-app-rail .hag-sec-act { margin-left:auto; padding:2px 6px; border:0; border-radius:6px; background:none; font:inherit;
    font-size:11px; font-weight:800; color:var(--v2-blue, #2f6bed); cursor:pointer; }
  .v2-app-rail .hag-sec-act:hover { background:var(--v2-blue-soft, #eaf1fe); }
  .v2-app-rail .hag-v2row { display:flex; align-items:baseline; gap:6px; width:100%; padding:6px 10px; border:0; border-radius:11px;
    background:transparent; font-family:inherit; text-align:left; cursor:pointer; white-space:nowrap; overflow:hidden; }
  .v2-app-rail .hag-v2row:hover { background:var(--v2-blue-soft, #eaf1fe); }
  .v2-app-rail .hag-v2row .v2-row-t { flex:none; max-width:60%; }
  .v2-app-rail .hag-v2row small { min-width:0; overflow:hidden; text-overflow:ellipsis; font-size:11.5px; font-weight:700; color:var(--v2-mute-2, #98a2b3); }
  .v2-app-rail .hag-v2row time { margin-left:auto; padding-left:6px; flex:none; font-size:11px; font-weight:700; color:var(--v2-mute-2, #98a2b3); }
  body.app-v2.v2-rail-min .v2-app-rail .hag-railsec, body.app-v2.v2-rail-min .v2-app-rail .hag-railcard { display:none !important; }
  /* 담당 프로젝트 — ③ 펼치기 칸 작게 ④ 줄 낮게 (원래 26×30 칸 · 줄 약 36px → 20×22 칸 · 약 28px) */
  .v2-app-rail .v2-pjt-h.rpg-h { padding:1px 3px; }
  .v2-app-rail .rpg-tog { flex:0 0 20px; height:22px; margin:auto 0; border-radius:6px; }
  .v2-app-rail .rpg-ic svg { width:11px; height:11px; }
  .v2-app-rail .rpg-go { min-height:26px; }
  .v2-app-rail .rpg-tog.off { background:transparent; cursor:default; }
  /* ① 나머지 보기 · 검색 */
  .v2-app-rail .hag-pj-more { display:block; width:100%; margin-top:2px; padding:7px 10px; border:0; border-top:1px solid var(--v2-line-2, #eef0f4);
    border-radius:0 0 10px 10px; background:none; font-family:inherit; font-size:11.5px; font-weight:800; color:var(--v2-blue, #2f6bed);
    text-align:left; cursor:pointer; }
  .v2-app-rail .hag-pj-more:hover { background:var(--v2-blue-soft, #eaf1fe); }
  .v2-app-rail .hag-pj-search { padding:3px 3px 5px; }
  .v2-app-rail .hag-pj-search input { width:100%; height:30px; padding:0 10px; border:1px solid var(--v2-line, #e3e7ee); border-radius:8px;
    font-family:inherit; font-size:12px; outline:0; background:#fff; }
  .v2-app-rail .hag-pj-search input:focus { border-color:var(--v2-blue, #2f6bed); }
  /* 원가조정 등 — AI 창 머리의 문서 아이콘(모양은 옆 [⧉] 아이콘과 같은 dde-ai-ico) · 드롭다운 */
  #dde-ai .hag-hist-ico.on { background:#eef1f5; border-color:#d3d9e2; color:#1c2432; }
  #hag-hist-dd { position:fixed; z-index:1300; width:330px; max-height:min(520px,calc(100vh - 80px)); display:flex; flex-direction:column;
    background:#fff; border:1px solid #d5dae1; border-radius:12px; box-shadow:0 12px 32px rgba(15,23,42,.16); overflow:hidden; font-size:14px; }
  .hag-dd-head { padding:14px 16px 10px; border-bottom:1px solid #eef0f3; }
  .hag-dd-head strong { display:block; font-size:15.5px; font-weight:800; color:#1c2432; }
  .hag-dd-head span { font-size:13px; color:#6b7280; }
  .hag-dd-list { flex:1; overflow:auto; padding-bottom:6px; }
  .hag-dd-list .hag-hg { padding:12px 16px 4px; }
  .hag-dd-list .hag-hi { padding:8px 16px; }
  .hag-dd-foot { padding:12px 16px; border:0; border-top:1px solid #eef0f3; background:#fff; text-align:left; font:inherit; font-size:14px;
    font-weight:700; color:#1F4E8C; cursor:pointer; }
  .hag-dd-foot:hover { background:#f6f7f9; }
  /* AI 창 안 지난 대화 */
  #dde-ai .hag-past { position:absolute; left:0; right:0; top:46px; bottom:0; z-index:5; display:flex; flex-direction:column; background:#fff; }
  .hag-past-head { display:flex; align-items:center; gap:12px; padding:10px 14px; border-bottom:1px solid #e2e5ea; background:#f8fafc; }
  .hag-past-head button { flex:none; height:32px; padding:0 12px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; font:inherit;
    font-size:13.5px; font-weight:700; color:#1c2432; cursor:pointer; }
  .hag-past-head strong { display:block; font-size:14.5px; font-weight:800; color:#1c2432; }
  .hag-past-head span { font-size:12.5px; color:#6b7280; }
  .hag-past-body { flex:1; overflow:auto; padding:14px; display:flex; flex-direction:column; gap:14px; font-size:14px; }
  .hag-past-body .hag-card { padding:12px 14px; }
  .hag-past-body .hag-lead { font-size:15px; }
  .hag-past-body .hag-p, .hag-past-body .hag-brief div, .hag-past-body .hag-list { font-size:14px; }
  .hag-past-body .hag-av { width:28px; height:28px; font-size:11px; }
  .hag-past-body .hag-bubble { font-size:14px; }
  .hag-past-body .hag-tbl { font-size:13.5px; }
  .hag-past-body .hag-tbl td, .hag-past-body .hag-tbl th { padding:8px 10px; }
  /* 좁은 AI 창 — 표는 글씨 · 칸을 줄이고 두 번째 칸(지금 예산 · 기간 · 검수 주기)은 숨김. 합계 줄의 colspan 칸은 그대로 */
  .hag-past-body .hag-col { min-width:0; overflow:hidden; }
  .hag-past-body .hag-tbl th:nth-child(2), .hag-past-body .hag-tbl td:nth-child(2) { display:none; }
  .hag-past-body .hag-tbl { font-size:13px; }
  .hag-past-body .hag-tbl td, .hag-past-body .hag-tbl th { padding:7px 8px; white-space:nowrap; }
  .hag-past-body .hag-acc { padding:2px 6px; font-size:12.5px; white-space:nowrap; }
  .hag-past-body .hag-done { flex-wrap:wrap; }
  .hag-past-body .hag-done button { margin-left:0; }
  .hag-past-body .hag-helps { grid-template-columns:1fr; }
  .hag-past-body .hag-acts { flex-wrap:wrap; }
  .hag-past-body .hag-link { margin-left:0; }
  .hag-past-body .hag-chips button { height:32px; padding:0 12px; font-size:13.5px; }
  .hag-past-foot { padding:10px 12px 12px; border-top:1px solid #e2e5ea; }
  .hag-past-foot .hag-box { padding:4px 4px 4px 12px; }
  .hag-past-foot .hag-box input { height:36px; font-size:14.5px; }
  .hag-past-foot .hag-box button { height:36px; padding:0 14px; font-size:14px; }`;
  document.head.appendChild(st);
})();

// 이미 그려진 홈이 있으면(파일이 늦게 로드된 경우) 다시 그림
(function () {
  const m = document.getElementById('s-main');
  if (m && m.querySelector('.v2-home') && typeof initDashboard === 'function') { try { initDashboard(); } catch (e) { /* 무시 */ } }
})();
