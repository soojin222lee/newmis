// ════════════════════════════════════════
//  관리자 > 알림 · 메일 관리 > [메일링리스트] · [메일 템플릿] 탭        작성: 남주
// ════════════════════════════════════════
//
// AS-IS 「메일발송 관리」(base-front src/views/admin/postbox)는 탭 3개(메일발송 관리 · 템플릿관리 · 발송이력)다.
// 목업에는 발송이력(admin-mail.js, 수진)만 있어 나머지 둘을 옮긴다.
//   · MailingList.vue      → 메일링리스트(mailing): 어떤 이벤트에 · 누구에게 · 어떤 템플릿으로 보낼지
//   · TemplateManagement.vue → 메일 템플릿(mailtpl): 제목 · 내용
// admin.js · admin-mail.js 는 고치지 않고, 뒤에 로드되어 ADMIN_SECTIONS 에 두 화면을 넣고 admSectionBody 를 감싼다.
// 메뉴 묶음(admin-menu-group.js)이 이 두 키를 '알림 · 메일 관리' 탭으로 보여 준다.
//
// AS-IS 와 다르게 한 것
//   · 그리드 행추가 · 바로 입력 → 등록/수정 팝업(목업 어드민 공통 방식)
//   · 발송형식은 AS-IS 선택지(이벤트 수신 시 · 수동)만. 코드에만 남은 '예약(발송주기)' 경로는 선택지에 없어 뺌
//   · [전송]은 AS-IS 처럼 수동 줄에서만, 수신자 검사 → "전송 하시겠습니까?" 확인 → 목업 토스트

// ── 선택지(AS-IS Mailing.ts) ──
var AMS_SVC = ['기반', '수주', '플랫폼', '손익추정', '투자', 'Data Insight', 'UI/UX'];
var AMS_SEND = ['이벤트 수신 시', '수동'];
var AMS_RCV = ['개인', '사용자 그룹', '사용자 역할'];
// 연결 이벤트(AS-IS 는 서버 업무 이벤트 목록 skcc-mis-bizevents) — 목업 이벤트
var AMS_EVENTS = ['예산 승인요청 도착', '예산 승인완료', '예산 반려', '프로젝트 종료 임박', 'ERP 전송 실패', '월마감 인건비 반영', 'P단가 변경', '권한 변경'];

var AMS_DEF = {
  tpl: [
    { id: 'T-105', title: '[결재요청] ${프로젝트명} 실행예산 상신', date: '2026-11-20', body: '${수신자}님,\n\n${프로젝트명} 실행예산이 상신되었습니다.\n결재함에서 확인해 주세요.\n\n- 기안자: ${기안자}\n- 상신일: ${상신일}' },
    { id: 'T-104', title: '[승인완료] ${프로젝트명} 실행예산 승인', date: '2026-11-20', body: '${수신자}님,\n\n${프로젝트명} 실행예산이 최종 승인되었습니다.' },
    { id: 'T-103', title: '[알림] ${프로젝트명} 종료 ${남은일수}일 전', date: '2026-11-12', body: '${프로젝트명} 종료 예정일(${종료일})이 ${남은일수}일 남았습니다.\n종료 전 점검 항목을 확인해 주세요.' },
    { id: 'T-102', title: '[경보] ERP 예산 전송 실패', date: '2026-10-30', body: 'ERP 예산 전송이 실패했습니다.\n- 대상: ${프로젝트명}\n- 오류: ${오류내용}\n\n재전송이 필요합니다.' },
    { id: 'T-101', title: '[안내] ${마감월} 인건비 실적 생성 완료', date: '2026-10-28', body: '${마감월} 월마감 인건비 실적이 생성되었습니다.' },
  ],
  mailing: [
    { id: 'ML-21', svc: '수주', title: '실행예산 결재요청 알림',   event: '예산 승인요청 도착', rcvType: '사용자 역할', rcvDetail: '팀장',            rcv: '',              key: 'BUDGET_APPROVAL', tpl: 'T-105', page: '실행예산 원가조정', send: '이벤트 수신 시' },
    { id: 'ML-20', svc: '수주', title: '실행예산 승인완료 통지',   event: '예산 승인완료',     rcvType: '개인',        rcvDetail: '',                rcv: '21043,21055',   key: 'BUDGET_DONE',     tpl: 'T-104', page: '실행예산 원가현황', send: '이벤트 수신 시' },
    { id: 'ML-19', svc: '수주', title: '프로젝트 종료 30일 전 안내', event: '프로젝트 종료 임박', rcvType: '사용자 그룹', rcvDetail: 'AX사업본부 PM',   rcv: '',              key: 'PJT_CLOSE_D30',   tpl: 'T-103', page: '프로젝트 현황',     send: '이벤트 수신 시' },
    { id: 'ML-18', svc: '기반', title: 'ERP 전송 실패 경보',       event: 'ERP 전송 실패',     rcvType: '사용자 역할', rcvDetail: '시스템관리자',     rcv: '',              key: 'ERP_FAIL',        tpl: 'T-102', page: '',                  send: '이벤트 수신 시' },
    { id: 'ML-17', svc: '수주', title: '월마감 인건비 반영 안내(수동)', event: '월마감 인건비 반영', rcvType: '사용자 그룹', rcvDetail: '원가 마감 담당자', rcv: '',            key: 'MONTH_CLOSE_LABOR', tpl: 'T-101', page: '실행예산 원가현황', send: '수동' },
  ],
};
var AMS_KEY = 'budgetai.admin.asismail.v1';
var AMS = {};
(function amsLoad() {
  var s = {};
  try { s = JSON.parse(localStorage.getItem(AMS_KEY) || '{}') || {}; } catch (e) { s = {}; }
  Object.keys(AMS_DEF).forEach(function (k) { AMS[k] = s[k] != null ? s[k] : JSON.parse(JSON.stringify(AMS_DEF[k])); });
})();
function amsPersist() { try { localStorage.setItem(AMS_KEY, JSON.stringify(AMS)); } catch (e) {} }
function amsE(s) { return (typeof admEsc === 'function') ? admEsc(s) : String(s == null ? '' : s); }
function amsMembers() { return (typeof AAS !== 'undefined' && AAS.member) || []; }
function amsGroups() { return (typeof AAS !== 'undefined' && AAS.ugroup) || []; }
function amsRoles() { return (typeof ADM_ROLES !== 'undefined') ? ADM_ROLES : []; }
function amsPages() { return ((typeof AAS !== 'undefined' && AAS.page) || []).map(function (p) { return p.name; }); }
function amsTplTitle(id) { var t = AMS.tpl.find(function (x) { return x.id === id; }); return t ? t.title : ''; }
function amsRcvNames(csv) {
  return String(csv || '').split(',').filter(Boolean).map(function (emp) {
    var m = amsMembers().find(function (x) { return x.emp === emp; }); return m ? m.name : emp;
  }).join(', ');
}
function amsEmpty(n, msg) { return '<tr><td colspan="' + n + '" class="aas-empty">' + (msg || '조회된 데이터가 없습니다.') + '</td></tr>'; }

// ── 조회 조건(입력 → [조회]로 적용) ──
var amsDraft = { mailing: {}, mailtpl: {} }, amsQ = { mailing: {}, mailtpl: {} };
function amsSet(scr, k, v) { amsDraft[scr][k] = v; }
function amsSearch(scr) { amsQ[scr] = JSON.parse(JSON.stringify(amsDraft[scr])); asiteRender(); }
function amsReset(scr) { amsDraft[scr] = {}; amsQ[scr] = {}; asiteRender(); }
function amsSearchBox(scr, fields) {
  var d = amsDraft[scr];
  return '<div class="aas-searchbox">' + fields.map(function (f) {
    if (f.opts) return '<div class="aas-sf"><label>' + f.label + '</label><select class="adm-filter" onchange="amsSet(\'' + scr + '\',\'' + f.k + '\',this.value)"><option value="">전체</option>'
      + f.opts.map(function (o) { return '<option' + (d[f.k] === o ? ' selected' : '') + '>' + amsE(o) + '</option>'; }).join('') + '</select></div>';
    return '<div class="aas-sf"><label>' + f.label + '</label><input class="adm-search" value="' + amsE(d[f.k] || '') + '" oninput="amsSet(\'' + scr + '\',\'' + f.k + '\',this.value)" onkeydown="if(event.key===\'Enter\')amsSearch(\'' + scr + '\')"></div>';
  }).join('') + '<div class="aas-sbtns"><button class="adm-btn" onclick="amsReset(\'' + scr + '\')">초기화</button><button class="adm-btn pri" onclick="amsSearch(\'' + scr + '\')">조회</button></div></div>';
}

// ════ ① 메일링리스트 ════
function amsRcvText(r) {
  if (r.rcvType === '개인') return amsRcvNames(r.rcv) || '<span class="ams-need">미지정</span>';
  return r.rcvDetail ? '<span class="adm-tag">' + amsE(r.rcvDetail) + '</span>' : '<span class="ams-need">미지정</span>';
}
function amsMailingHtml() {
  var q = amsQ.mailing;
  var rows = AMS.mailing.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) {
    return (!q.svc || x.r.svc === q.svc) && (!q.title || x.r.title.toLowerCase().indexOf(q.title.toLowerCase()) >= 0);
  });
  // AS-IS '발송기능' 칸의 [전송]은 오른쪽 고정 '관리' 칸으로 옮김 — 칸이 많아 1366 에서 가로 스크롤 뒤로 숨지 않게
  var head = ['메일링ID', '구분', '제목', '연결 이벤트', '수신자유형', '수신자', '업무키', '템플릿', '연결화면', '발송형식', '관리'];
  var body = rows.length ? rows.map(function (x) {
    var r = x.r, i = x.i;
    return '<tr><td class="adm-code">' + amsE(r.id) + '</td><td><span class="adm-tag">' + amsE(r.svc) + '</span></td><td><b>' + amsE(r.title) + '</b></td>'
      + '<td>' + amsE(r.event || '-') + '</td><td>' + amsE(r.rcvType) + '</td><td>' + amsRcvText(r) + '</td>'
      + '<td class="adm-code">' + amsE(r.key || '-') + '</td><td class="adm-muted" title="' + amsE(amsTplTitle(r.tpl)) + '">' + amsE(r.tpl || '-') + '</td>'
      + '<td class="adm-muted">' + amsE(r.page || '-') + '</td>'
      + '<td><span class="adm-pill ' + (r.send === '수동' ? 'amber' : 'blue') + '">' + amsE(r.send) + '</span></td>'
      + '<td class="ams-stick">' + (r.send === '수동' ? '<button class="adm-btn sm pri" onclick="amsSendAsk(' + i + ')">전송</button> ' : '')
      + '<button class="adm-btn sm" onclick="amsMailingForm(' + i + ')">수정</button> <button class="adm-btn sm del" onclick="amsAskDel(\'mailing\',' + i + ')">삭제</button></td></tr>';
  }).join('') : amsEmpty(head.length);
  return amsSearchBox('mailing', [{ k: 'svc', label: '구분', opts: AMS_SVC }, { k: 'title', label: '제목' }])
    + '<div class="adm-toolbar aas-bar"><span class="aas-cnt">검색결과 <b>' + rows.length + '</b>건 <span class="adm-muted">/ 총 ' + AMS.mailing.length + '건</span></span><span class="aas-sp"></span>'
    + '<button class="adm-btn" onclick="amsSave(\'메일링리스트\')">저장</button><button class="adm-btn pri" onclick="amsMailingForm(null)">＋ 메일링 등록</button></div>'
    + '<div class="aas-scroll"><table class="adm-table aas-table aas-nowrap"><thead><tr>' + head.map(function (h) { return '<th' + (h === '관리' ? ' class="ams-stick"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>'
    + '<div class="adm-note">※ 연결 이벤트가 생기면(발송형식 = 이벤트 수신 시) 템플릿으로 메일을 만들어 수신자에게 자동 발송합니다. 발송형식 = 수동 은 [전송]을 눌러 보냅니다.<br>'
    + '※ 수신자는 수신자유형에 따라 개인(사람 여러 명) · 사용자 그룹(사용자 관리 > 사용자 그룹) · 사용자 역할(권한 · 보안 관리의 역할) 중 하나로 지정합니다. 발송 결과는 [메일 발송 이력] 탭에서 봅니다.</div>';
}
function amsSave(noun) { amsPersist(); admToast(noun + ' 변경 내용을 저장했습니다.'); }

function amsSel(id, opts, val, blank, onch) {
  return '<select id="' + id + '"' + (onch ? ' onchange="' + onch + '"' : '') + '>' + (blank ? '<option value="">' + blank + '</option>' : '')
    + opts.map(function (o) { var v = typeof o === 'string' ? o : o[0], t = typeof o === 'string' ? o : o[1]; return '<option value="' + amsE(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + amsE(t) + '</option>'; }).join('') + '</select>';
}
// 수신자 칸: 유형에 따라 다른 고르기
function amsRcvField(type, r) {
  if (type === '개인') {
    var on = String(r.rcv || '').split(',');
    return '<div class="ams-pick">' + amsMembers().map(function (m) {
      return '<label class="ams-pick-i"><input type="checkbox" class="ams-rcv-emp" value="' + m.emp + '"' + (on.indexOf(m.emp) >= 0 ? ' checked' : '') + '> ' + amsE(m.name) + ' <span class="adm-muted">' + amsE(m.dept) + '</span></label>';
    }).join('') + '</div>';
  }
  if (type === '사용자 그룹') return amsSel('ams-f-rcvDetail', amsGroups().map(function (g) { return g.name; }), r.rcvDetail, '사용자 그룹 선택');
  return amsSel('ams-f-rcvDetail', amsRoles(), r.rcvDetail, '사용자 역할 선택');
}
function amsRcvTypeChange(i) {
  var t = document.getElementById('ams-f-rcvType').value;
  var r = i != null ? AMS.mailing[i] : {};
  document.getElementById('ams-rcv-box').innerHTML = amsRcvField(t, r.rcvType === t ? r : {});
  document.getElementById('ams-rcv-lbl').textContent = t === '개인' ? '수신자 (여러 명 선택)' : t === '사용자 그룹' ? '수신자유형상세 (사용자 그룹)' : '수신자유형상세 (사용자 역할)';
}
function amsMailingForm(i) {
  i = (i == null || i === 'null') ? null : Number(i);
  var r = i != null ? AMS.mailing[i] : { svc: '수주', rcvType: '개인', send: '이벤트 수신 시' };
  var tpls = AMS.tpl.map(function (t) { return [t.id, t.id + ' · ' + t.title]; });
  admModal('<div class="adm-modal wide ams-modal"><div class="adm-modal-head"><b>' + (i != null ? '메일링 수정' : '메일링 등록') + '</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="adm-form">'
    + '<div class="adm-field"><label>구분</label>' + amsSel('ams-f-svc', AMS_SVC, r.svc) + '</div>'
    + '<div class="adm-field"><label>발송형식</label>' + amsSel('ams-f-send', AMS_SEND, r.send) + '</div>'
    + '<div class="adm-field full"><label>제목<span class="req">*</span></label><input id="ams-f-title" value="' + amsE(r.title || '') + '"></div>'
    + '<div class="adm-field"><label>연결 이벤트</label>' + amsSel('ams-f-event', AMS_EVENTS, r.event, '없음') + '</div>'
    + '<div class="adm-field"><label>업무키</label><input id="ams-f-key" value="' + amsE(r.key || '') + '" placeholder="예: BUDGET_APPROVAL"></div>'
    + '<div class="adm-field"><label>템플릿<span class="req">*</span></label>' + amsSel('ams-f-tpl', tpls, r.tpl, '템플릿 선택') + '</div>'
    + '<div class="adm-field"><label>연결화면</label>' + amsSel('ams-f-page', amsPages(), r.page, '없음') + '</div>'
    + '<div class="adm-field"><label>수신자유형</label>' + amsSel('ams-f-rcvType', AMS_RCV, r.rcvType, '', 'amsRcvTypeChange(' + (i != null ? i : 'null') + ')') + '</div>'
    + '<div class="adm-field full"><label id="ams-rcv-lbl">' + (r.rcvType === '개인' ? '수신자 (여러 명 선택)' : '수신자유형상세 (' + r.rcvType.replace('사용자 ', '사용자 ') + ')') + '<span class="req">*</span></label><div id="ams-rcv-box">' + amsRcvField(r.rcvType, r) + '</div></div>'
    + '</div><div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button>'
    + '<button class="adm-btn pri" onclick="amsMailingSave(' + (i != null ? i : 'null') + ')">' + (i != null ? '수정' : '등록') + '</button></div></div>');
}
function amsRcvCheck(o) {
  if (o.rcvType === '개인' && !o.rcv) return '수신자 정보를 선택해 주세요.';
  if (o.rcvType === '사용자 그룹' && !o.rcvDetail) return '사용자 그룹 정보를 선택해 주세요.';
  if (o.rcvType === '사용자 역할' && !o.rcvDetail) return '사용자 역할 정보를 선택해 주세요.';
  return '';
}
function amsMailingSave(i) {
  i = (i == null || i === 'null') ? null : Number(i);
  var v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
  var o = i != null ? JSON.parse(JSON.stringify(AMS.mailing[i])) : { id: 'ML-' + (Math.max.apply(null, AMS.mailing.map(function (m) { return Number(String(m.id).replace(/\D/g, '')) || 0; }).concat([0])) + 1) };
  o.svc = v('ams-f-svc'); o.send = v('ams-f-send'); o.title = v('ams-f-title'); o.event = v('ams-f-event'); o.key = v('ams-f-key');
  o.tpl = v('ams-f-tpl'); o.page = v('ams-f-page'); o.rcvType = v('ams-f-rcvType');
  if (o.rcvType === '개인') { o.rcvDetail = ''; o.rcv = Array.prototype.slice.call(document.querySelectorAll('.ams-rcv-emp:checked')).map(function (el) { return el.value; }).join(','); }
  else { o.rcv = ''; o.rcvDetail = v('ams-f-rcvDetail'); }
  if (!o.title) { admToast('제목을 입력해 주세요.'); return; }
  if (!o.tpl) { admToast('템플릿을 선택해 주세요.'); return; }
  var msg = amsRcvCheck(o); if (msg) { admToast(msg); return; }
  if (i != null) AMS.mailing[i] = o; else AMS.mailing.unshift(o);
  amsPersist(); admCloseModal(); asiteRender(); admToast('메일링을 ' + (i != null ? '수정' : '등록') + '했습니다.');
}
function amsSendAsk(i) {
  var r = AMS.mailing[i]; if (!r) return;
  var msg = amsRcvCheck(r); if (msg) { admToast(msg); return; }
  var who = r.rcvType === '개인' ? amsRcvNames(r.rcv) : r.rcvType + ' · ' + r.rcvDetail;
  admModal('<div class="adm-modal" style="width:440px"><div class="adm-modal-head"><b>메일 전송</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-confirm">전송 하시겠습니까?<br><br><b>' + amsE(r.title) + '</b><br><span class="adm-muted">수신자 · ' + amsE(who) + '<br>템플릿 · ' + amsE(r.tpl + ' ' + amsTplTitle(r.tpl)) + '</span></div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri" onclick="admCloseModal();admToast(\'전송했습니다. (목업: 실제 발송 없음)\')">전송</button></div></div>');
}
function amsAskDel(scr, i) {
  var arr = scr === 'mailing' ? AMS.mailing : AMS.tpl, r = arr[i]; if (!r) return;
  var used = scr === 'mailtpl' ? AMS.mailing.filter(function (m) { return m.tpl === r.id; }).length : 0;
  admModal('<div class="adm-modal" style="width:420px"><div class="adm-modal-head"><b>삭제 확인</b><button class="adm-modal-x" onclick="admCloseModal()">✕</button></div>'
    + '<div class="aas-confirm"><b>' + amsE(r.title) + '</b> 을(를) 삭제하시겠습니까?'
    + (used ? '<br><span style="color:#c40025">이 템플릿을 쓰는 메일링이 ' + used + '건 있습니다. 삭제하면 그 메일링은 템플릿이 비게 됩니다.</span>' : '<br><span class="adm-muted">삭제 후에는 되돌릴 수 없습니다.</span>') + '</div>'
    + '<div class="adm-modal-foot"><button class="adm-btn" onclick="admCloseModal()">취소</button><button class="adm-btn pri aas-danger" onclick="amsDel(\'' + scr + '\',' + i + ')">삭제</button></div></div>');
}
function amsDel(scr, i) {
  if (scr === 'mailing') AMS.mailing.splice(i, 1);
  else { var id = AMS.tpl[i].id; AMS.tpl.splice(i, 1); AMS.mailing.forEach(function (m) { if (m.tpl === id) m.tpl = ''; }); if (amsTplSel === id) amsTplSel = null; }
  amsPersist(); admCloseModal(); asiteRender(); admToast('삭제했습니다.');
}

// ════ ② 메일 템플릿 — 왼쪽 목록 + 오른쪽 내용 편집(AS-IS 와 같은 배치) ════
var amsTplSel = null;   // 선택 템플릿 id | 'new'
function amsTplHtml() {
  var q = amsQ.mailtpl;
  var rows = AMS.tpl.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return !q.title || x.r.title.toLowerCase().indexOf(q.title.toLowerCase()) >= 0; });
  if (amsTplSel == null && rows.length) amsTplSel = rows[0].r.id;
  var body = rows.length ? rows.map(function (x) {
    var used = AMS.mailing.filter(function (m) { return m.tpl === x.r.id; }).length;
    return '<tr class="' + (amsTplSel === x.r.id ? 'aas-on' : '') + '" onclick="amsTplPick(\'' + x.r.id + '\')" style="cursor:pointer"><td class="adm-code">' + amsE(x.r.id) + '</td>'
      + '<td><b>' + amsE(x.r.title) + '</b>' + (used ? ' <span class="adm-muted">· 메일링 ' + used + '</span>' : '') + '</td><td class="adm-muted">' + amsE(x.r.date) + '</td>'
      + '<td style="text-align:center"><button class="adm-btn sm del" onclick="event.stopPropagation();amsAskDel(\'mailtpl\',' + x.i + ')">삭제</button></td></tr>';
  }).join('') : amsEmpty(4);
  var isNew = amsTplSel === 'new';
  var t = isNew ? { id: '', title: '', body: '', date: '' } : (AMS.tpl.find(function (x) { return x.id === amsTplSel; }) || null);
  var vars = ['${수신자}', '${프로젝트명}', '${기안자}', '${상신일}', '${종료일}', '${남은일수}', '${마감월}', '${오류내용}'];
  var edit = t ? '<div class="ams-edit"><div class="ams-edit-h"><b>' + (isNew ? '새 템플릿' : amsE(t.id)) + '</b>' + (t.date ? '<span class="adm-muted"> · 등록일자 ' + amsE(t.date) + '</span>' : '') + '</div>'
    + '<div class="adm-field full"><label>제목<span class="req">*</span></label><input id="ams-t-title" value="' + amsE(t.title) + '"></div>'
    + '<div class="adm-field full"><label>내용<span class="req">*</span></label><textarea id="ams-t-body" rows="12">' + amsE(t.body) + '</textarea></div>'
    + '<div class="ams-vars"><span class="adm-muted">넣을 수 있는 값</span>' + vars.map(function (v) { return '<button class="ams-var" onclick="amsTplVar(\'' + v + '\')" title="내용 커서 위치에 넣기">' + v + '</button>'; }).join('') + '</div>'
    + '<div class="ams-edit-f"><button class="adm-btn" onclick="amsTplCancel()">취소</button><button class="adm-btn pri" onclick="amsTplSave()">' + (isNew ? '등록' : '저장') + '</button></div></div>'
    : '<div class="ams-edit aas-empty">왼쪽에서 템플릿을 고르거나 [＋ 템플릿 등록]을 누르세요.</div>';
  return amsSearchBox('mailtpl', [{ k: 'title', label: '제목' }])
    + '<div class="aas-split"><div class="aas-main"><div class="adm-toolbar aas-bar"><span class="aas-cnt">검색결과 <b>' + rows.length + '</b>건 <span class="adm-muted">/ 총 ' + AMS.tpl.length + '건</span></span><span class="aas-sp"></span>'
    + '<button class="adm-btn pri" onclick="amsTplPick(\'new\')">＋ 템플릿 등록</button></div>'
    + '<table class="adm-table aas-table"><thead><tr><th>템플릿ID</th><th>제목</th><th>등록일자</th><th style="text-align:center">관리</th></tr></thead><tbody>' + body + '</tbody></table></div>'
    + edit + '</div>'
    + '<div class="adm-note">※ 메일링리스트의 [템플릿]에서 고른 템플릿으로 메일을 만듭니다. <b>${…}</b> 자리는 발송 때 실제 값으로 바뀝니다. 쓰고 있는 템플릿을 지우면 그 메일링은 템플릿이 비게 됩니다.</div>';
}
function amsTplPick(id) { amsTplSel = id; asiteRender(); }
function amsTplCancel() { amsTplSel = AMS.tpl.length ? AMS.tpl[0].id : null; asiteRender(); }
function amsTplVar(v) {
  var ta = document.getElementById('ams-t-body'); if (!ta) return;
  var s = ta.selectionStart || ta.value.length;
  ta.value = ta.value.slice(0, s) + v + ta.value.slice(ta.selectionEnd || s);
  ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.length;
}
function amsTplSave() {
  var title = document.getElementById('ams-t-title').value.trim(), body = document.getElementById('ams-t-body').value.trim();
  if (!title) { admToast('제목을 입력해 주세요.'); return; }
  if (!body) { admToast('내용을 입력해 주세요.'); return; }
  if (amsTplSel === 'new') {
    var id = 'T-' + (Math.max.apply(null, AMS.tpl.map(function (t) { return Number(String(t.id).replace(/\D/g, '')) || 0; }).concat([100])) + 1);
    var today = (typeof admNowStr === 'function') ? admNowStr().slice(0, 10) : new Date().toISOString().slice(0, 10);
    AMS.tpl.unshift({ id: id, title: title, body: body, date: today }); amsTplSel = id;
    amsPersist(); asiteRender(); admToast('템플릿을 등록했습니다.');
  } else {
    var t = AMS.tpl.find(function (x) { return x.id === amsTplSel; }); if (!t) return;
    t.title = title; t.body = body; amsPersist(); asiteRender(); admToast('템플릿을 저장했습니다.');
  }
}

// ── 화면 등록: ADMIN_SECTIONS 에 넣고(메뉴 묶음이 탭으로 씀) admSectionBody 를 감쌈 ──
(function amsRegister() {
  if (typeof ADMIN_SECTIONS === 'undefined' || typeof admSectionBody !== 'function') return;
  [{ key: 'mailing', icon: '📮', title: '메일링리스트', group: 'ops', desc: '어떤 이벤트에 · 누구에게 · 어떤 템플릿으로 메일을 보낼지 정합니다. 수동 발송 건은 [전송]으로 보냅니다.', src: '관리자 직접 등록 (AS-IS 메일발송 관리)' },
   { key: 'mailtpl', icon: '📝', title: '메일 템플릿', group: 'ops', desc: '메일 제목과 내용 틀을 관리합니다. ${…} 자리는 발송 때 실제 값으로 바뀝니다.', src: '관리자 직접 작성 (AS-IS 템플릿관리)' }]
    .forEach(function (s) { if (!ADMIN_SECTIONS.some(function (x) { return x.key === s.key; })) ADMIN_SECTIONS.push(s); });
  var before = admSectionBody;
  admSectionBody = function (key) { return key === 'mailing' ? amsMailingHtml() : key === 'mailtpl' ? amsTplHtml() : before(key); };
})();

(function amsStyle() {
  if (document.getElementById('ams-style')) return;
  var st = document.createElement('style'); st.id = 'ams-style';
  st.textContent = ''
    + '.ams-need{color:#c40025;font-weight:700;font-size:12px}'
    + '.aas-scroll>.adm-table{overflow:visible}'
    + '.adm-table .ams-stick{position:sticky;right:0;text-align:right;white-space:nowrap;background:#fff;box-shadow:-8px 0 8px -8px rgba(15,23,42,.18);z-index:1}'
    + '.adm-table th.ams-stick{background:var(--sk-head,#f7f9fc);text-align:center}.adm-table tr:hover td.ams-stick{background:#fafbfc}'
    + '.ams-modal .adm-form{max-height:64vh;overflow:auto}'
    + '.ams-pick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 10px;max-height:170px;overflow:auto;border:1px solid var(--sk-border,#e5e7eb);border-radius:8px;padding:8px 10px}'
    + '.ams-pick-i{display:flex;gap:6px;align-items:center;font-size:13px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.ams-edit{flex:0 0 46%;background:#fff;border:1px solid var(--sk-border,#e5e7eb);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px}'
    + '.ams-edit .adm-field{display:flex;flex-direction:column;gap:5px}.ams-edit .adm-field label{font-size:12.5px;font-weight:800;color:#475569}'
    + '.ams-edit input,.ams-edit textarea{border:1px solid var(--sk-border-strong,#cbd5e1);border-radius:8px;padding:9px 11px;font-family:inherit;font-size:13.5px;line-height:1.6}'
    + '.ams-edit-h{font-size:14px}.ams-edit-f{display:flex;justify-content:flex-end;gap:6px}'
    + '.ams-vars{display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:12px}'
    + '.ams-var{border:1px solid #cfe0fb;background:var(--sk-blue-soft,#e8f0fe);color:var(--sk-blue-deep,#1d4ed8);border-radius:6px;padding:3px 7px;font-size:12px;font-family:inherit;cursor:pointer}';
  document.head.appendChild(st);
})();
