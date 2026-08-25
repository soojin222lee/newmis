const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
// 예산 알림 해설 AI(/api/ai/*) — 로직은 전부 ai-proxy.js. 키는 여기와 같이 process.env 만 사용.
const { handleAiApi } = require("./ai-proxy");

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
  // AI 보고서 요약/제언 (인사이트 보고서 생성)
  if (pathname === "/api/report-summary" && method === "POST") {
    handleReportSummary(body, res); return;
  }
  // AI 대화 (메인 chatbot) — 선택된 PJT 숫자를 문맥으로 함께 받는다
  if (pathname === "/api/chat" && method === "POST") {
    handleChat(body, res); return;
  }
  // 원가 소진율 AI 분석 (인사이트 진척 탭)
  if (pathname === "/api/progress-summary" && method === "POST") {
    handleProgressSummary(body, res); return;
  }
  // 종합현황 AI Insight (인사이트 종합현황 탭)
  if (pathname === "/api/insight" && method === "POST") {
    handleInsight(body, res); return;
  }
  // 예산 알림 해설 (/api/ai/*) — ai-proxy.js 가 처리했으면 여기서 종료
  if (handleAiApi(pathname, method, body, res)) return;
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
  // 붙여넣기 시 딸려오는 공백·개행을 제거한다 (헤더에 개행이 들어가면 요청이 통째로 실패)
  const key = String(process.env.OPENAI_API_KEY || "").trim();
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
  let req;
  try {
  req = https.request({
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
  } catch (e) { cb(e); return; }
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

// ── AI 보고서 요약/제언 ──
function localReportSummary(d) {
  const m = d.metrics || {};
  let s = `${d.project}은 계약금액 ${m.contract}억 규모로, 계약 원가 기준은 ${m.base}억입니다. 현재 실적은 ${m.actual}억(진행 ${m.prog}%), 실행예산은 ${m.budget}억, 예상원가는 ${m.forecast}억으로 예상 원가율은 ${m.rate}%입니다. `;
  if ((m.diff || 0) >= 0) s += `예상 원가율이 계획 대비 +${m.diff}%p 상승해 수익성 저하가 우려됩니다. 주요 원인은 ${d.cause}이며, 현재 추세가 유지될 경우 실행예산 변경 검토가 필요합니다. 외주비 비중이 높아 우선 관리 대상입니다.`;
  else s += `예상 원가율이 계획 대비 ${m.diff}%p 개선되어 계획 범위 내에서 안정적으로 관리되고 있습니다. 주요 요인은 ${d.cause}입니다.`;
  const g = d.progress;
  if (g) s += ` 원가 소진율 측면에서는 계획율 ${g.planRate}% 대비 소진율 ${g.actualRate}%(편차 ${g.dev >= 0 ? "+" : ""}${g.dev}%p)이며, 합의 Cost ${g.cost}억 중 실적 ${g.actual}억·집행예정 ${g.committed}억·잔여 ${g.remaining}억(손실예비비 ${g.reserve}억)으로 예상 최종 소진율은 ${g.fcEnd}%입니다.`;
  const ups = (d.versions || []).filter(v => v.delta > 0).sort((a, b) => b.delta - a.delta);
  if (ups.length) s += ` 버전별로는 총액을 유지한 채 계정 간 배분이 이동해 ${ups[0].name}가 ${ups[0].delta >= 0 ? "+" : ""}${ups[0].delta}억 늘었습니다.`;
  return s;
}
function buildReportPrompt(d) {
  const m = d.metrics || {};
  const acc = (d.accounts || []).map(a => `  - ${a.name}: 계획 ${a.plan}억 / 실적 ${a.actual}억 / 예상 ${a.forecast}억 (계획대비 ${a.delta >= 0 ? "+" : ""}${a.delta}억, 비중 ${a.share}%)`).join("\n");
  const g = d.progress || null;
  const progBlock = g ? `
[원가 소진율]
기간 전체 ${g.periodTotal}개월 중 ${g.periodCur}개월째 / 계획율 ${g.planRate}% vs 소진율(실적) ${g.actualRate}% (편차 ${g.dev >= 0 ? "+" : ""}${g.dev}%p) / 예상 최종 소진율 ${g.fcEnd}%
합의 Cost ${g.cost}억 = 실적 ${g.actual}억 + 집행예정 ${g.committed}억 + 잔여 ${g.remaining}억 (그중 손실예비비 ${g.reserve}억)` : "";
  const vers = (d.versions || []).map(v => `  - ${v.name}: 기준 ${v.base}억 → 현재 ${v.current}억 (${v.delta >= 0 ? "+" : ""}${v.delta}억)`).join("\n");
  const verBlock = vers ? `
[버전별 계정 변동 — 예산 돌려쓰기]
총액은 유지하면서 계정 간 배분만 이동:
${vers}` : "";
  return `너는 SI 프로젝트 손익·원가 보고서를 쓰는 애널리스트다. 아래는 한 프로젝트의 세 가지 분석(① 종합현황 ② 원가 소진율 ③ 버전별 계정 변동)이다. 이 셋을 종합하여 경영진 보고용 '요약 및 제언'을 한국어로 작성해라. 6~8문장, 자연스러운 문단(마크다운·불릿 금지). 현황 요약 → 소진 속도/진척 → 계정 배분(돌려쓰기) 변화 → 핵심 리스크 → 다음 행동 제언 순서로 종합하고, 숫자는 억·% 단위 그대로 사용해라.

[종합현황]
프로젝트: ${d.project} (상태: ${d.status})
계약금액 ${m.contract}억 / 원가(계약) ${m.base}억 / 실행예산 ${m.budget}억
실적 ${m.actual}억(진행 ${m.prog}%) / 예상원가 ${m.forecast}억 / 예상 원가율 ${m.rate}% (계획대비 ${m.diff >= 0 ? "+" : ""}${m.diff}%p)
주요 원인: ${d.cause}
계정별:
${acc}${progBlock}${verBlock}`;
}
function handleReportSummary(body, res) {
  if (!body || !body.project) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid payload" })); return; }
  const fallback = localReportSummary(body);
  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(200); res.end(JSON.stringify({ summary: fallback, source: "fallback" })); return;
  }
  callLLM(buildReportPrompt(body), (err, text) => {
    if (err || !text) { res.writeHead(200); res.end(JSON.stringify({ summary: fallback, source: "fallback", note: err ? String(err.message || err) : "empty" })); return; }
    res.writeHead(200); res.end(JSON.stringify({ summary: text, source: "ai" }));
  });
}

// ── 종합현황 AI Insight ──
function localInsight(d) {
  const m = d.metrics || {};
  const lines = [];
  if ((m.diff || 0) >= 0) lines.push(`예상 원가율이 계획 대비 +${m.diff}%p 상승했습니다. 주요 원인은 ${d.cause}이며 관리가 필요합니다.`);
  else lines.push(`예상 원가율이 계획 대비 ${m.diff}%p 개선되어 계획 범위 내에서 관리되고 있습니다.`);
  lines.push(`현재 실적은 ${m.actual}억(진행 ${m.prog}%)이며 예상원가는 ${m.forecast}억으로 전망됩니다.`);
  const top = (d.accounts || []).slice().sort((a, b) => (b.forecast || 0) - (a.forecast || 0))[0];
  if (top) lines.push(`${top.name} 비중이 ${top.share}%로 가장 커 우선 점검 대상입니다.`);
  return lines.join("\n");
}
function buildInsightPrompt(d) {
  const m = d.metrics || {};
  const acc = (d.accounts || []).map(a => `  - ${a.name}: 계획 ${a.plan}억 / 실적 ${a.actual}억 / 예상 ${a.forecast}억 (비중 ${a.share}%)`).join("\n");
  return `너는 SI 프로젝트 종합현황을 분석하는 애널리스트다. 아래 데이터에서 PM이 지금 주목해야 할 핵심 인사이트 3가지를 뽑아 각각 한국어 한 문장으로 써라. 각 인사이트는 줄바꿈으로만 구분하고, 불릿기호·번호·마크다운은 절대 쓰지 마라. 원인과 시사점 중심으로, 숫자는 억·% 단위 그대로 사용해라.

프로젝트: ${d.project} (상태 ${d.status})
계약 ${m.contract}억 / 원가(계약) ${m.base}억 / 실행예산 ${m.budget}억
실적 ${m.actual}억(진행 ${m.prog}%) / 예상원가 ${m.forecast}억 / 예상 원가율 ${m.rate}% (계획대비 ${m.diff >= 0 ? "+" : ""}${m.diff}%p)
주요 원인: ${d.cause}
계정별:
${acc}`;
}
function handleInsight(body, res) {
  if (!body || !body.project) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid payload" })); return; }
  const fallback = localInsight(body);
  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(200); res.end(JSON.stringify({ insight: fallback, source: "fallback" })); return;
  }
  callLLM(buildInsightPrompt(body), (err, text) => {
    if (err || !text) { res.writeHead(200); res.end(JSON.stringify({ insight: fallback, source: "fallback", note: err ? String(err.message || err) : "empty" })); return; }
    res.writeHead(200); res.end(JSON.stringify({ insight: text, source: "ai" }));
  });
}

// ── 원가 소진율 분석 ──
function localProgressSummary(d) {
  const dev = d.dev || 0;
  const tot = d.period ? d.period.total : 12, cur = d.period ? d.period.current : 0;
  let s = `${d.project || "이 프로젝트"}은 전체 ${tot}개월 중 ${cur}개월째로, 계획율 ${d.planRate}% 대비 소진율(실적)은 ${d.actualRate}%입니다. `;
  if (dev > 2) s += `계획보다 ${dev}%p 빠르게 소진되고 있어 조기 소진에 주의가 필요합니다. `;
  else if (dev < -2) s += `계획보다 ${Math.abs(dev)}%p 느리게 집행되어 계획 범위 내에서 관리되고 있습니다. `;
  else s += `계획과 소진 속도가 거의 일치해 정상 범위입니다. `;
  s += `합의 Cost ${d.cost}억 중 실적 ${d.actual}억, 집행예정 ${d.committed}억이며 잔여는 ${d.remaining}억입니다. 잔여 중 손실예비비 ${d.reserve}억은 언더런(원가 절감) 잠재 금액입니다. `;
  if ((d.fcEnd || 0) > 100) s += `다만 예상 최종 소진율이 ${d.fcEnd}%로 합의 Cost를 초과할 전망이라 실행예산 재검토가 필요합니다.`;
  else s += `예상 최종 소진율은 ${d.fcEnd}%로 Cost 범위 내 착지가 예상됩니다.`;
  return s;
}
function buildProgressPrompt(d) {
  const acc = (d.accounts || []).map(a => `  - ${a.name}: 원가 ${a.base}억 / 계획 ${a.plan}억 / 실적 ${a.actual}억`).join("\n");
  const tot = d.period ? d.period.total : 12, cur = d.period ? d.period.current : 0;
  return `너는 SI 프로젝트의 원가 소진 현황을 분석하는 애널리스트다. 아래 데이터로 '원가 소진율 분석'을 비개발자 PM이 이해하기 쉽게 한국어 4~5문장으로 작성해라. 자연스러운 문단(마크다운·불릿 금지). 진행 속도(계획율 vs 소진율)와 편차 해석 → 합의 Cost 분해(실적/집행예정/잔여/손실예비비) → 예상 최종 착지와 다음 행동 제언 순서로. 숫자는 억·% 단위 그대로 사용해라.

프로젝트: ${d.project}
기간: 전체 ${tot}개월 중 ${cur}개월째
계획율 ${d.planRate}% / 소진율(실적) ${d.actualRate}% / 진척 편차 ${d.dev >= 0 ? "+" : ""}${d.dev}%p / 예상 최종 소진율 ${d.fcEnd}%
합의 Cost ${d.cost}억 = 실적 ${d.actual}억 + 집행예정 ${d.committed}억 + 잔여 ${d.remaining}억 (그중 손실예비비 ${d.reserve}억)
계정별:
${acc}`;
}
function handleProgressSummary(body, res) {
  if (!body || !body.project) { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid payload" })); return; }
  const fallback = localProgressSummary(body);
  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(200); res.end(JSON.stringify({ summary: fallback, source: "fallback" })); return;
  }
  callLLM(buildProgressPrompt(body), (err, text) => {
    if (err || !text) { res.writeHead(200); res.end(JSON.stringify({ summary: fallback, source: "fallback", note: err ? String(err.message || err) : "empty" })); return; }
    res.writeHead(200); res.end(JSON.stringify({ summary: text, source: "ai" }));
  });
}

server.listen(PORT, () => {
  console.log(`\n✅ PM 대시보드가 실행 중입니다.`);
  console.log(`   http://localhost:${PORT}\n`);
});


// ── AI 대화 (메인 chatbot) ─────────────────────────────────
// 브라우저는 이 서버를 경유하므로 OPENAI_API_KEY가 클라이언트로 나가지 않는다.
// 키가 없으면 문맥 숫자만으로 규칙 기반 답변을 만들어 화면이 비지 않게 한다.
function buildChatPrompt(d) {
  const q = String(d.question || "").slice(0, 500);
  const c = d.context || {};
  const lines = [];
  if (c.project) lines.push("대상 프로젝트: " + c.project);
  else lines.push("대상: 담당 전체 프로젝트");
  const f = c.finance;
  if (f) {
    lines.push("계약금액 " + f.cp + "억 / 수행원가 계획 " + f.plan + "억 / 실적 " + f.act + "억 / 잔여 " + f.left + "억");
    lines.push("예상 원가율 " + f.rate + "% (관리 기준선 85%)");
    lines.push("당월 계획 대비 실적 차이 " + f.mgap + "억");
    if (Array.isArray(f.accounts) && f.accounts.length) {
      lines.push("계정별 (계획/실적/잔여/여력%):");
      f.accounts.forEach(function (a) {
        lines.push("- " + a.name + ": " + a.plan + "억 / " + a.act + "억 / " + a.left + "억 / " + a.pct + "%");
      });
    }
  }
  if (Array.isArray(c.todos) && c.todos.length) {
    lines.push("확인이 필요한 항목: " + c.todos.join(" · "));
  }
  return "아래는 실행예산 시스템의 현재 데이터다. 이 숫자만 근거로 답하고, 없는 수치는 추측하지 마라.\n\n"
    + lines.join("\n") + "\n\n질문: " + q;
}

function localChatAnswer(d) {
  const c = d.context || {};
  const f = c.finance;
  const who = c.project ? c.project : "담당 전체 프로젝트";
  if (!f) return who + "에 대한 질문을 받았습니다. 화면에서 프로젝트를 선택하면 더 구체적으로 답할 수 있어요.";
  let s = who + "은 계약금액 " + f.cp + "억, 수행원가 계획 " + f.plan + "억이고 실적은 "
    + f.act + "억입니다. 잔여는 " + f.left + "억이며 예상 원가율은 " + f.rate + "%입니다. ";
  s += (f.rate >= 85)
    ? "관리 기준선 85%를 넘어 손익 조기경보 대상입니다. "
    : "관리 기준선 85% 이내입니다. ";
  const tight = Array.isArray(f.accounts)
    ? f.accounts.slice().sort(function (a, b) { return a.pct - b.pct; })[0] : null;
  if (tight) s += "여력이 가장 낮은 계정은 " + tight.name + "으로 " + tight.pct + "%(잔여 " + tight.left + "억)입니다. ";
  if (Array.isArray(c.todos) && c.todos.length) {
    s += "지금 확인이 필요한 항목은 " + c.todos.length + "건입니다: " + c.todos.join(", ") + ".";
  }
  return s;
}

function handleChat(body, res) {
  if (!body || typeof body.question !== "string" || !body.question.trim()) {
    res.writeHead(400); res.end(JSON.stringify({ error: "Invalid payload" })); return;
  }
  const fallback = localChatAnswer(body);
  if (!process.env.OPENAI_API_KEY) {
    res.writeHead(200); res.end(JSON.stringify({ answer: fallback, source: "fallback" })); return;
  }
  callLLM(buildChatPrompt(body), function (err, text) {
    if (err || !text) {
      res.writeHead(200);
      res.end(JSON.stringify({ answer: fallback, source: "fallback", note: err ? String(err.message || err) : "empty" }));
      return;
    }
    res.writeHead(200); res.end(JSON.stringify({ answer: text, source: "ai" }));
  });
}
