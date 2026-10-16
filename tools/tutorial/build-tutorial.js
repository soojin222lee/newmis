// 실제 MIS 목업(public/index.html이 참조하는 CSS+JS 전부)을 인라인하고,
// 그 위에 튜토리얼 오버레이(공용 엔진 + 설정)를 얹은 '단독 실행 HTML'을 생성한다.
//   → 화면/로직은 실제 목업 그대로, 오버레이만 추가(기존 화면 미변경).
//
// 구조:
//   tutorial-engine.js          공용 오버레이 엔진(스포트라이트·말풍선 드래그·스크롤 잠금 등)
//   tutorial-config-*.js        튜토리얼별 설정(단계/문구/대상). 엔진 뒤에 붙여 주입한다.
//
// 사용:  node tools/tutorial/build-tutorial.js <configFile> <outName> <docTitle> <publicName>
//   예:  node tools/tutorial/build-tutorial.js tutorial-config-si.js "AiBudget-튜토리얼-수주형등록.html" "AiBudget 업무 튜토리얼 · 수주형 등록" tutorial-si.html
//   - dist/<outName> 과 public/tutorials/<publicName> 에 생성(57291 서버가 /tutorials/ 로 제공).
//   - 전체 재생성은 같은 폴더의 build-all.(cmd|sh) 참고.
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const ROOT = path.resolve(HERE, '..', '..');   // tools/tutorial → 저장소 루트
const PUB = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'dist');

const CONFIG_FILE = process.argv[2] || 'tutorial-config-si.js';
const OUT_NAME = process.argv[3] || 'AiBudget-튜토리얼-수주형등록.html';
const DOC_TITLE = process.argv[4] || 'AiBudget 업무 튜토리얼 · 수주형 등록';
const PUBLIC_NAME = process.argv[5] || '';

function read(rel) { return fs.readFileSync(path.join(PUB, rel), 'utf8'); }

const indexHtml = read('index.html');
const cssFiles = [...indexHtml.matchAll(/<link[^>]+href="\/([^"?]+\.css)[^"]*"[^>]*>/g)].map(m => m[1]);
const jsFiles  = [...indexHtml.matchAll(/<script[^>]+src="\/([^"?]+\.js)[^"]*"[^>]*><\/script>/g)].map(m => m[1]);

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
  + '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
  + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">';

// 서버 없이 /api/* 호출 가로채기(엔드포인트별 형태 보정) — file:// 로도 열 수 있게
const API_SHIM = '<script>(function(){var rf=window.fetch?window.fetch.bind(window):null;'
  + 'window.fetch=function(u,o){u=String(u||"");if(u.indexOf("/api/")>-1){'
  + 'var arr=(u.indexOf("/api/risks")>-1)||/\\/api\\/.*(list|rows|items)/.test(u);'
  + 'return Promise.resolve({ok:true,'
  + 'json:function(){return Promise.resolve(arr?[]:{answer:"이 파일은 서버 없이 동작하는 튜토리얼 공유본입니다.",insight:"",source:"offline",ok:false});}});}'
  + 'return rf?rf(u,o):Promise.reject(new Error("no fetch"));};})();</script>';

function buildBody(html) {
  let body = html.slice(html.indexOf('<body'), html.lastIndexOf('</body>'));
  body = body.replace(/<body[^>]*>/, '');
  body = body.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>\s*/g, '');
  body = body.replace(/<link[^>]+rel="stylesheet"[^>]*>\s*/g, '');
  return body.trim();
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const css = cssFiles.map(f => `/* ===== ${f} ===== */\n${read(f)}`).join('\n\n');
const js  = jsFiles.map(f => `/* ===== ${f} ===== */\n${read(f)}`).join('\n;\n');
const engine = fs.readFileSync(path.join(HERE, 'tutorial-engine.js'), 'utf8');
const config = fs.readFileSync(path.join(HERE, CONFIG_FILE), 'utf8');
const overlay = engine + '\n/* ===== config ===== */\n' + config;

const out = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${DOC_TITLE}</title>
${FONTS}
<!-- 단독 실행 튜토리얼 — 실제 목업(CSS ${cssFiles.length}+JS ${jsFiles.length}) 인라인 + 오버레이 -->
<style>
${css}
</style>
</head>
<body>
${buildBody(indexHtml)}
<script>
${js}
</script>
${API_SHIM}
<!-- ===== 튜토리얼 오버레이 ===== -->
<script>
${overlay}
</script>
</body>
</html>
`;

const outPath = path.join(OUT_DIR, OUT_NAME);
fs.writeFileSync(outPath, out, 'utf8');
console.log('생성:', outPath, '(' + Math.round(Buffer.byteLength(out) / 1024).toLocaleString('en-US') + ' KB)');
if (PUBLIC_NAME) {
  const pubDir = path.join(PUB, 'tutorials');
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
  const pubPath = path.join(pubDir, PUBLIC_NAME);
  fs.writeFileSync(pubPath, out, 'utf8');
  console.log('생성(서버 제공):', pubPath, '→ http://localhost:57291/tutorials/' + PUBLIC_NAME);
}
