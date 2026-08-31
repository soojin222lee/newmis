// AI GUIDE: 수행원가 > 원가조정 화면만 담은 "단독 실행 HTML" 생성기입니다.
//
// [2026.08.27 위클리 피드백 반영] 원가조정 화면을 사외/타부서에 공유하기 위한 파일 빌더.
//   - public/index.html 이 참조하는 CSS 8개 + JS 35개 중, 원가조정에 필요한 것만 골라 인라인합니다.
//   - 서버(/api/*)가 없는 file:// 환경에서도 열리도록 fetch 를 로컬 응답으로 가로챕니다.
//   - 다른 담당자 화면(인사이트·프로젝트관리·레포트 등)의 스크립트는 담지 않습니다.
//
// 사용법:  node tools/build-budget-adjust-share.js
// 결과물:  dist/원가조정-Agent콘솔.html  (더블클릭하면 브라우저에서 바로 열립니다)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, '원가조정-Agent콘솔.html');

// 원가조정 화면이 실제로 쓰는 CSS (index.html 로드 순서 유지)
const CSS = [
  'css/main.css',
  'css/initiation-extra.css',
  'css/initiation-extra2.css',
  'css/sk-theme.css',
  'css/home.css',
  'css/ai-agent.css',
  'css/si-project.css',      // 경비 자원계획이 .sifr 토큰을 상속합니다
];

// 원가조정 화면이 실제로 쓰는 JS (로드 순서 = override 순서. 절대 바꾸지 마세요)
const JS = [
  'js/app.js',                    // 라우터 · 전역(fmt/escHtml/showToast) · AI 대화창
  'js/budget-status.js',          // 공유 코어 1 (BUDGET_SOURCE · CATS · EXEC_BUDGET_PROJECTS)
  'js/budget-status-2.js',        // 공유 코어 2
  'js/budget-status-3.js',        // 공유 코어 3 (renderBudgetPage · 계정 타일 · 예산내역 표)
  'js/budget-status-4.js',        // 공유 코어 4 (계정별 작성 · CP총액 · 계정별 합계표)
  'js/budget-status-5.js',        // 공유 코어 5
  'js/budget-cost-status.js',     // #/budget-status 라우트
  'js/budget-cost-adjust.js',     // #/budget-adjust 라우트
  'js/budget-cost-history.js',    // #/budget-history 라우트
  'js/budget-area-routes.js',     // 계정 슬러그 · 딥링크
  'js/budget-area-as.js',
  'js/budget-area-expense.js',
  'js/budget-area-material.js',
  'js/budget-area-outsource.js',
  'js/budget-area-labor.js',
  'js/budget-agent-console.js',   // 예산관리전문Agent 콘솔 (반드시 마지막)
];

function read(rel) {
  const p = path.join(PUB, rel);
  if (!fs.existsSync(p)) throw new Error('없는 파일: ' + rel);
  return fs.readFileSync(p, 'utf8');
}

// index.html 에서 상단바 · 화면 컨테이너 · AI 대화창 · toast 만 남기고 나머지 화면 div 는 버립니다.
function buildBody(html) {
  // 다른 화면 div 는 비어 있는 컨테이너뿐이라 통째로 지워도 안전합니다(라우터가 typeof 로 방어).
  const keepScreens = ['s-budget'];
  let body = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>'));
  body = body.replace(/<body[^>]*>/, '');
  // <script>, <link> 태그 제거 (아래에서 인라인으로 다시 넣습니다)
  body = body.replace(/<script[^>]*src=[^>]*><\/script>\s*/g, '');
  // 유지하지 않는 화면 div 제거
  body = body.replace(/<div class="screen" id="(s-[a-z-]+)"><\/div>\s*/g,
    (m, id) => (keepScreens.includes(id) ? m : ''));
  return body;
}

// file:// 에서도 화면이 죽지 않게, 서버 API 호출을 로컬 응답으로 가로챕니다.
const API_SHIM = `
<script>
/* [공유본] 서버(/api/*)가 없는 환경용 — 호출을 가로채 로컬 응답을 돌려줍니다.
   Agent 대화·직책자 질의는 화면에 담긴 제안 데이터를 근거로 답합니다. */
(function () {
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  function localAnswer(question) {
    try {
      var pend = (typeof agentProposalsFinal === 'function') ? agentProposalsFinal('pending') : [];
      if (!pend.length) return '검토 대기 중인 예산 변경은 없습니다. Agent가 구매시스템 PO·SCM 투입계획·ERP 가용예산·월 마감 실적을 계속 보고 있습니다.';
      var head = '검토 대기 ' + pend.length + '건입니다. ' + pend.map(function (p) {
        return p.acct + ' ' + (p.to - p.from > 0 ? '+' : '') + (p.to - p.from).toLocaleString('en-US') + '원';
      }).join(' · ') + '.';
      return head + ' 가장 시급한 건은 ' + pend[0].acct + ' — ' + pend[0].title + ' 입니다. 근거: ' + pend[0].why;
    } catch (e) {
      return '이 파일은 서버 없이 동작하는 공유본이라, AI 응답은 화면에 담긴 데이터를 근거로 요약해 드립니다.';
    }
  }
  window.fetch = function (url, opts) {
    var u = String(url || '');
    if (u.indexOf('/api/') === 0 || u.indexOf('/api/') > -1) {
      var q = '';
      try { q = JSON.parse((opts && opts.body) || '{}').question || ''; } catch (e) {}
      return Promise.resolve({
        ok: true,
        json: function () { return Promise.resolve({ answer: localAnswer(q), source: 'offline', ok: false }); },
      });
    }
    return realFetch ? realFetch(url, opts) : Promise.reject(new Error('no fetch'));
  };
})();
</script>
<script>
/* [공유본] 열면 곧바로 원가조정(예산관리전문Agent 콘솔)로 진입합니다. */
window.addEventListener('load', function () {
  setTimeout(function () {
    try {
      if (typeof costMode !== 'undefined') costMode = 'adjust';
      if (typeof openBudgetProjectScreen === 'function') openBudgetProjectScreen('budgetMock');
      if (typeof budgetSetupEditAccount !== 'undefined') budgetSetupEditAccount = null;
      if (typeof renderBudgetPage === 'function') renderBudgetPage();
    } catch (e) {
      document.body.insertAdjacentHTML('afterbegin',
        '<pre style="padding:20px;color:#b91c1c">화면을 여는 중 오류: ' + e.message + '</pre>');
    }
  }, 150);
});
</script>`;

function main() {
  const html = read('index.html');
  const title = '원가조정 · 예산관리전문Agent 콘솔';

  const css = CSS.map(f => `/* ===== ${f} ===== */\n${read(f)}`).join('\n\n');
  const js = JS.map(f => `/* ===== ${f} ===== */\n${read(f)}`).join('\n;\n');

  const out = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<!--
  ${title}
  [2026.08.27 위클리 피드백 반영] 원가조정 화면 공유본 — 서버 없이 브라우저에서 바로 열립니다.
  생성: node tools/build-budget-adjust-share.js
  포함: CSS ${CSS.length}개 + JS ${JS.length}개 (원가조정 화면에 필요한 것만)
-->
<style>
${css}
</style>
</head>
<body>
${buildBody(html)}
<script>
${js}
</script>
${API_SHIM}
</body>
</html>
`;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, out, 'utf8');
  const kb = Math.round(Buffer.byteLength(out, 'utf8') / 1024);
  console.log('생성 완료: ' + path.relative(ROOT, OUT) + '  (' + kb.toLocaleString('en-US') + ' KB)');
  console.log('  CSS ' + CSS.length + '개 / JS ' + JS.length + '개 인라인');
}

main();
