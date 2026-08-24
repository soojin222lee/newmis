const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");

const PORT = Number(process.env.PORT || 57291);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css" : "text/css",
  ".js"  : "application/javascript",
  ".json": "application/json",
};

const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_BODY   = 1_000_000; // 1MB 요청 바디 상한
const DATA_FILE  = path.join(__dirname, "data.json");

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {}
  return getDefaultData();
}

function saveData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

function getDefaultData() {
  return {
    risks: [
      { id:"c1", proj:"cloud", level:"높음",  title:"외주비 집행률 77.7%",        sub:"ATS/AGS/KBP 잔여 예산 검토",           action:"외주비 세부 확인 필요",             guide:"ATS/AGS/KBP별 잔여 예산, PO 예정 금액, 향후 2개월 발주 계획을 함께 비교해 초과 가능성을 점검하세요.",   status:"미조치",  checks:[true,false,false], memos:[{who:"김혜연",when:"07.18 14:22",txt:"ATS 잔여 예산 확인 완료. KBP 발주 계획 재검토 중.",sig:true}] },
      { id:"c2", proj:"cloud", level:"주의",  title:"인건비 MM 투입 19.9MM",       sub:"고정 투입 인원 조정 검토",               action:"인건비 투입 조정 검토",             guide:"인력별 담별 MM과 남은 예산을 비교해 고정 투입 인원 조정 여부를 검토하세요.",                             status:"미조치",  checks:[false,false,false], memos:[] },
      { id:"e1", proj:"erp",   level:"중간",  title:"일정 지연 가능성",            sub:"1차 검수 일정 재확인",                   action:"1차 검수 일정 재확인",             guide:"검수 체크리스트 사전 배포 및 담당자 확인이 필요합니다.",                                                status:"검토중",  checks:[true,true,false],  memos:[{who:"이수민",when:"07.20 10:05",txt:"체크리스트 초안 작성 완료. 담당자 배포 예정.",sig:true}] },
      { id:"m1", proj:"mobile",level:"낮음",  title:"QA 인력 부족 우려",           sub:"외부 리소스 투입 여부 검토",              action:"QA 리소스 확보 계획 수립",          guide:"QA 일정을 재점검하고 외부 리소스 투입 여부를 검토하세요.",                                               status:"조치완료", checks:[true,true,true],   memos:[{who:"최현우",when:"07.15 09:10",txt:"A업체 계약 확정. 7/22부터 투입 예정.",sig:true}] },
      { id:"s1", proj:"sec",   level:"높음",  title:"납품 D-1 최종 점검 미완료",   sub:"보안 취약점 스캔 및 승인 문서",          action:"납품 체크리스트 최종 확인",         guide:"납품 전 보안 취약점 스캔 결과 및 승인 문서를 확인하세요.",                                               status:"미조치",  checks:[false,false,false], memos:[] },
      { id:"c3", proj:"cloud", level:"주의",  title:"서버 비용 월 초과 가능성",    sub:"리소스 사용 패턴 분석 필요",             action:"클라우드 리소스 최적화 실행",       guide:"월별 리소스 사용 추이를 분석해 불필요한 인스턴스를 정리하세요.",                                          status:"조치완료", checks:[true,true,true],   memos:[{who:"김혜연",when:"07.10 14:22",txt:"12개 인스턴스 중지 조치. 월 예상 절감액 약 320만원.",sig:true}] },
      { id:"e2", proj:"erp",   level:"중간",  title:"외부 연동 API 응답 지연",     sub:"결제 모듈 연동 안정성 점검",             action:"API 타임아웃 설정 조정",            guide:"결제사 API SLA 문서를 재확인하고 타임아웃 임계값을 조정하세요.",                                           status:"조치완료", checks:[true,true,true],   memos:[{who:"이수민",when:"07.12 15:40",txt:"타임아웃 3초→8초 조정 완료. 연동 테스트 통과.",sig:true}] },
      { id:"m2", proj:"mobile",level:"높음",  title:"iOS 심사 반려 위험",          sub:"개인정보 처리 방침 미업데이트",          action:"개인정보 처리 방침 즉시 업데이트", guide:"App Store 심사 가이드라인 5.1.1을 재확인하고 항목별 대응 여부를 점검하세요.",                             status:"조치완료", checks:[true,true,true],   memos:[{who:"최현우",when:"07.08 13:00",txt:"개인정보 처리 방침 업데이트 및 심사 재제출 완료.",sig:true}] },
    ]
  };
}

let appData = loadData();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    let body = "", aborted = false;
    req.on("data", c => {
      if (aborted) return;
      body += c;
      if (body.length > MAX_BODY) {
        aborted = true;
        res.writeHead(413); res.end(JSON.stringify({ error: "Payload too large" }));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (aborted) return;
      try { handleAPI(url.pathname, req.method, body ? JSON.parse(body) : null, res); }
      catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: "Bad request" })); }
    });
    return;
  }

  // 정적 파일 서빙
  let reqPath;
  try { reqPath = decodeURIComponent(url.pathname); }
  catch (e) { res.writeHead(400); res.end("Bad request"); return; }
  if (reqPath === "/") reqPath = "/index.html";

  const filePath = path.normalize(path.join(PUBLIC_DIR, reqPath));
  // public 디렉터리 밖으로의 접근 차단(디렉터리 이탈 방지)
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(data);
  });
});

function handleAPI(pathname, method, body, res) {
  // 리스크 목록
  if (pathname === "/api/risks" && method === "GET") {
    res.writeHead(200); res.end(JSON.stringify(appData.risks)); return;
  }
  // 리스크 메모 저장
  const memoMatch = pathname.match(/^\/api\/risks\/([^/]+)\/memo$/);
  if (memoMatch && method === "POST") {
    const risk = appData.risks.find(r => r.id === memoMatch[1]);
    if (!risk) { res.writeHead(404); res.end(JSON.stringify({ error: "Not found" })); return; }
    if (!body || typeof body.memo !== "object" || body.memo === null
        || !Array.isArray(body.checks) || typeof body.status !== "string") {
      res.writeHead(400); res.end(JSON.stringify({ error: "Invalid payload" })); return;
    }
    if (!Array.isArray(risk.memos)) risk.memos = [];
    risk.memos.push(body.memo);
    risk.checks = body.checks;
    risk.status  = body.status;
    saveData(appData);
    res.writeHead(200); res.end(JSON.stringify(risk)); return;
  }
  // 예산 변동 LLM 요약 (키는 환경변수, 브라우저는 이 서버 경유 → 키 노출 없음)
  if (pathname === "/api/budget-summary" && method === "POST") {
    handleBudgetSummary(body, res); return;
  }
  res.writeHead(404); res.end(JSON.stringify({ error: "Not found" }));
}

// ── 예산 변동 요약 ──
function localBudgetSummary(d) {
  const acc = Array.isArray(d.accounts) ? d.accounts : [];
  const ups = acc.filter(a => a.delta > 0).sort((x, y) => y.delta - x.delta);
  const dns = acc.filter(a => a.delta < 0).sort((x, y) => x.delta - y.delta);
  const f = arr => arr.map(a => `${a.name} ${a.delta >= 0 ? "+" : ""}${a.delta}억`).join(", ");
  let s = `${d.project || "이 프로젝트"}의 총 실행예산은 ${d.total}억으로 버전 내내 동일하지만, 계정 간 배분이 이동했습니다. `;
  if (dns.length) s += `${f(dns)}가 줄고, `;
  if (ups.length) s += `${f(ups)}(으)로 옮겨갔습니다. `;
  s += `총액은 그대로이므로 계정 간 '예산 돌려쓰기'이며, 특히 ${ups[0] ? ups[0].name : "외주비"} 증가 추세를 주의 깊게 볼 필요가 있습니다.`;
  return s;
}
function buildBudgetPrompt(d) {
  const lines = (d.accounts || []).map(a =>
    `- ${a.name}: 기준 ${a.base}억 → 현재 ${a.current}억 (증감 ${a.delta >= 0 ? "+" : ""}${a.delta}억)`).join("\n");
  return `다음은 한 SI 프로젝트의 버전별 계정 예산 배분 데이터입니다. 총 실행예산은 유지하면서 계정 간 배분만 이동하는 '예산 돌려쓰기'를 비개발자 PM이 이해하기 쉽게 3~4문장으로 간단히 요약해 주세요. 숫자는 억 단위로, 어느 계정이 늘고 줄었는지와 주의할 점 중심으로. 마크다운·불릿 없이 자연스러운 한국어 문장으로만 답하세요.

프로젝트: ${d.project}
총 실행예산: ${d.total}억 (계약 원가 기준 ${d.baseTotal}억)
계정별 (기준 → 현재, 증감):
${lines}`;
}
// OpenAI Chat Completions 호출 — 키는 환경변수(OPENAI_API_KEY)에서만 읽는다(코드/깃에 저장 안 함)
function callLLM(prompt, cb) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const payload = JSON.stringify({
    model,
    messages: [
      { role: "system", content: "너는 SI 프로젝트 예산 분석을 돕는 어시스턴트다. 비개발자 PM이 이해하기 쉽게 간결한 한국어 문장으로만 답한다. 마크다운·불릿은 쓰지 않는다." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 600,
  });
  const req = https.request({
    hostname: "api.openai.com", path: "/v1/chat/completions", method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": "Bearer " + key,
      "content-length": Buffer.byteLength(payload),
    },
  }, r => {
    let b = ""; r.on("data", c => b += c);
    r.on("end", () => {
      try {
        const j = JSON.parse(b);
        if (r.statusCode >= 400) { cb(new Error(j.error && j.error.message ? j.error.message : "HTTP " + r.statusCode)); return; }
        const text = (((j.choices || [])[0] || {}).message || {}).content;
        cb(null, text ? text.trim() : null);
      } catch (e) { cb(e); }
    });
  });
  req.on("error", cb);
  req.setTimeout(20000, () => req.destroy(new Error("timeout")));
  req.write(payload); req.end();
}
function handleBudgetSummary(body, res) {
  if (!body || !Array.isArray(body.accounts)) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid payload" })); return; }
  const fallback = localBudgetSummary(body);
  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(200); res.end(JSON.stringify({ summary: fallback, source: "fallback" })); return;
  }
  callLLM(buildBudgetPrompt(body), (err, text) => {
    if (err || !text) { res.writeHead(200); res.end(JSON.stringify({ summary: fallback, source: "fallback", note: err ? String(err.message || err) : "empty" })); return; }
    res.writeHead(200); res.end(JSON.stringify({ summary: text, source: "ai" }));
  });
}

server.listen(PORT, () => {
  console.log(`\n✅ PM 대시보드가 실행 중입니다.`);
  console.log(`   http://localhost:${PORT}\n`);
});
