const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 57291);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css" : "text/css",
  ".js"  : "application/javascript",
  ".json": "application/json",
};

const DATA_FILE = path.join(__dirname, "data.json");

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

    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try { handleAPI(url.pathname, req.method, body ? JSON.parse(body) : null, res); }
      catch (e) { res.writeHead(400); res.end(JSON.stringify({ error: "Bad request" })); }
    });
    return;
  }

  // 정적 파일 서빙
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = path.join(__dirname, "public", filePath);
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
    risk.memos.push(body.memo);
    risk.checks = body.checks;
    risk.status  = body.status;
    saveData(appData);
    res.writeHead(200); res.end(JSON.stringify(risk)); return;
  }
  res.writeHead(404); res.end(JSON.stringify({ error: "Not found" }));
}

server.listen(PORT, () => {
  console.log(`\n✅ PM 대시보드가 실행 중입니다.`);
  console.log(`   http://localhost:${PORT}\n`);
});
