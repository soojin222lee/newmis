// AI GUIDE: AI 예산 알림 해설 백엔드입니다.
// - 목적: 화면이 감지한 예산 시그널(OT 미계획 실적, P레벨 단가 확정, SCM 인력 I/F, 분기 편중)에 대해
//   "원인 / 영향 / 조치" 3줄 해설을 생성합니다.
// - 엔드포인트: POST /api/ai/explain , GET /api/ai/health
// - server.js 는 handleAPI 진입부에서 이 모듈의 handleAiApi 를 먼저 시도합니다(위임 3줄).
//   AI 로직 전체가 이 파일에 있어 server.js 변경 폭을 최소화합니다.
//
// [키 처리 — server.js의 기존 LLM 기능(/api/budget-summary, /api/report-summary)과 동일한 방식]
// - 키는 process.env.OPENAI_API_KEY 에서만 읽습니다. 자체 .env 파서를 두지 않습니다.
// - 다만 편의를 위해 Node 내장 process.loadEnvFile 로 .env 를 process.env 에 실어줍니다.
//   · 쉘 환경변수가 파일보다 우선하므로 기존 실행 방식($env:OPENAI_API_KEY=...)을 덮지 않습니다.
//   · .env 가 없거나 구버전 Node라 이 API가 없으면 조용히 건너뜁니다 → 팀원 환경에 영향 없음.
//   · package.json 의 start 스크립트는 건드리지 않습니다(공용이라 실행 방식이 바뀌면 안 됨).
//   · 이 모듈이 server.js 상단에서 require 되므로, 기존 summary 기능도 같은 키를 그대로 씁니다.
// - 키가 없으면 LLM을 부르지 않고 로컬 규칙 기반 해설(source:"fallback")을 돌려줍니다.
//   기존 handleBudgetSummary / handleReportSummary 의 fallback 패턴과 같습니다.
//
// [비용 안전장치]
// - 응답 길이 상한(OPENAI_MAX_TOKENS, 기본 450)
// - 동일 요청 메모리 캐시 → 같은 알림을 여러 번 눌러도 1회만 과금
// - 분당 호출 상한(RATE_PER_MIN)

const https = require('https');
const path = require('path');

// .env → process.env (있을 때만, 실패해도 무시)
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.join(__dirname, '.env'));
  }
} catch (e) { /* .env 없음 — 쉘 환경변수만 사용 */ }

const RATE_PER_MIN = 20;
const CACHE_MAX = 100;
const TIMEOUT_MS = 20000;

function apiKey() {
  return String(process.env.OPENAI_API_KEY || '').trim();
}

// ── 캐시 / 레이트리밋 ─────────────────────────────────────────
const cache = new Map();
let callTimes = [];

function rateOk() {
  const now = Date.now();
  callTimes = callTimes.filter(t => now - t < 60000);
  if (callTimes.length >= RATE_PER_MIN) return false;
  callTimes.push(now);
  return true;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}

// ── 시그널별 업무 배경 (LLM은 이 목업의 업무 규칙을 모르므로 함께 전달) ──
const SIGNAL_CONTEXT = {
  'labor-ot': 'OT비는 사전 계획 없이도 OT 정산이 일어나면 실적이 먼저 발생할 수 있습니다. 그러면 계획 없이 인건비 실적만 늘어납니다.',
  'labor-prate': 'P레벨(직급) 단가는 매년 5월경 확정됩니다. 확정 전에 세운 인건비 계획은 전년 단가 기준이므로, 투입 인력과 MM이 전혀 바뀌지 않아도 예산이 초과될 수 있습니다.',
  'labor-scm': 'SCM은 인력 투입계획을 확정(승인)하는 별도 시스템입니다. SCM에서 확정되면 우리 시스템으로 I/F 수신되고, PM이 "등록"해야 비로소 인건비로 예산화됩니다.',
  'outsource-pace': '외주비는 업체별로 프로젝트 전체기간 예산을 1건 편성하고, 그 안에서 분기별로 PO(구매계약)를 나눠 발행합니다. 앞선 분기에 과도하게 계약하면 잔여 기간에 쓸 예산이 부족해집니다.',
};

// ── 키가 없을 때 쓰는 로컬 규칙 기반 해설 ────────────────────
const LOCAL_EXPLAIN = {
  'labor-ot': {
    cause: 'OT 정산은 사전 계획 없이도 실적이 먼저 발생하는 구조입니다.',
    impact: '계획에 없던 금액이 인건비 실적에 그대로 더해져 예산 대비 초과 폭이 커집니다.',
    action: 'OT비 탭에서 해당 월 계획금액을 실적에 맞춰 보정하세요.',
  },
  'labor-prate': {
    cause: 'P레벨 단가가 계획 수립 이후에 확정되어 계획 단가와 확정 단가가 다릅니다.',
    impact: '투입 인력과 MM이 그대로여도 단가 인상분만큼 인건비 예산이 초과됩니다.',
    action: '확정 단가로 인건비 계획을 재산정하고 초과분은 실행예산 변경으로 반영하세요.',
  },
  'labor-scm': {
    cause: 'SCM에서 확정된 인력이 I/F로 수신됐지만 우리 시스템에 아직 등록되지 않았습니다.',
    impact: '등록 전까지는 인건비 예산에 반영되지 않아 계획이 실제 투입보다 적게 잡힙니다.',
    action: '[확정 인력 등록]으로 수신 인력을 등록해 예산화하세요.',
  },
  'outsource-pace': {
    cause: '전체기간 예산 대비 앞선 분기에 PO가 집중 발행됐습니다.',
    impact: '잔여 기간에 쓸 수 있는 예산이 줄어 후반부 계약이 어려워질 수 있습니다.',
    action: '잔여예산과 남은 분기를 비교해 다음 PO 금액을 조정하세요.',
  },
};

function localExplain(kind) {
  return LOCAL_EXPLAIN[kind] || {
    cause: '시스템이 감지한 예산 변동입니다.',
    impact: '예산 대비 실적에 영향이 있을 수 있습니다.',
    action: '해당 상세계정에서 계획과 실적을 비교해 확인하세요.',
  };
}

// ── 프롬프트 ─────────────────────────────────────────────────
const SYSTEM_PROMPT = [
  '당신은 SI 프로젝트 수행원가(실행예산)를 관리하는 PM을 돕는 원가관리 전문가입니다.',
  '시스템이 감지한 예산 시그널 하나를 받아, 담당 PM이 바로 판단할 수 있게 해설합니다.',
  '',
  '반드시 아래 형식의 JSON 하나만 출력하세요. 그 외 텍스트·코드펜스는 금지합니다.',
  '{"cause":"...","impact":"...","action":"..."}',
  '',
  '작성 규칙',
  '- 각 항목은 한국어 한 문장, 60자 이내로 짧게 씁니다.',
  '- cause: 이 상황이 생긴 구조적 원인.',
  '- impact: 예산·원가에 미치는 영향. 받은 숫자를 근거로 언급합니다.',
  '- action: PM이 지금 할 수 있는 구체적 다음 행동 한 가지.',
  '- 받지 않은 숫자를 새로 만들어내지 마세요. 추측이 필요하면 "확인이 필요하다"고 씁니다.',
  '- 존댓말 종결(~입니다/~하세요)을 씁니다.',
].join('\n');

function buildUserPrompt(payload) {
  const lines = [];
  lines.push(`시그널 종류: ${payload.kind}`);
  if (SIGNAL_CONTEXT[payload.kind]) lines.push(`업무 배경: ${SIGNAL_CONTEXT[payload.kind]}`);
  if (payload.title) lines.push(`알림 제목: ${payload.title}`);
  if (payload.summary) lines.push(`화면 표시 내용: ${payload.summary}`);
  if (payload.facts && typeof payload.facts === 'object') {
    lines.push('관련 수치:');
    Object.entries(payload.facts).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
  }
  return lines.join('\n');
}

// ── OpenAI 호출 (server.js 의 callLLM 과 같은 https 방식) ────
function callLLM(payload, cb) {
  const body = JSON.stringify({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 450) || 450,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(payload) },
    ],
  });

  const req = https.request({
    hostname: 'api.openai.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      Authorization: `Bearer ${apiKey()}`,
    },
  }, res => {
    let raw = '';
    res.on('data', c => { raw += c; });
    res.on('end', () => {
      if (res.statusCode !== 200) {
        let msg = `HTTP ${res.statusCode}`;
        try { msg = JSON.parse(raw).error?.message || msg; } catch (e) {}
        cb(new Error(msg));
        return;
      }
      try {
        const content = JSON.parse(raw).choices?.[0]?.message?.content || '';
        const out = JSON.parse(content);
        cb(null, {
          cause: String(out.cause || '').trim(),
          impact: String(out.impact || '').trim(),
          action: String(out.action || '').trim(),
        });
      } catch (e) {
        cb(new Error('AI 응답을 해석할 수 없습니다.'));
      }
    });
  });

  req.on('error', cb);
  req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('timeout')));
  req.write(body);
  req.end();
}

// ── 라우터 ───────────────────────────────────────────────────
// 이 모듈이 처리했으면 true, 아니면 false를 반환합니다.
function handleAiApi(pathname, method, body, res) {
  const send = (code, obj) => { res.writeHead(code); res.end(JSON.stringify(obj)); };

  if (pathname === '/api/ai/health' && method === 'GET') {
    send(200, {
      ok: true,
      configured: !!apiKey(),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      cached: cache.size,
      hint: apiKey() ? null : '.env 에 OPENAI_API_KEY 를 넣고 npm start 로 재시작하세요(키가 없으면 로컬 해설로 대체됩니다).',
    });
    return true;
  }

  if (pathname === '/api/ai/explain' && method === 'POST') {
    if (!body || typeof body.kind !== 'string' || !body.kind) {
      send(400, { ok: false, message: 'kind 값이 필요합니다.' });
      return true;
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const fallback = localExplain(body.kind);

    // 키가 없으면 LLM 없이 로컬 해설 (기존 summary 엔드포인트와 동일한 fallback 패턴)
    if (!apiKey()) {
      send(200, { ok: true, source: 'fallback', ...fallback });
      return true;
    }

    const cacheKey = JSON.stringify({ k: body.kind, t: body.title, s: body.summary, f: body.facts });
    if (cache.has(cacheKey)) {
      send(200, { ok: true, source: 'ai', cached: true, model, ...cache.get(cacheKey) });
      return true;
    }
    if (!rateOk()) {
      send(200, {
        ok: true, source: 'fallback', ...fallback,
        note: `분당 호출 상한(${RATE_PER_MIN}회)을 넘어 로컬 해설로 대체했습니다.`,
      });
      return true;
    }

    callLLM(body, (err, out) => {
      if (err || !out) {
        send(200, {
          ok: true, source: 'fallback', ...fallback,
          note: err ? String(err.message || err) : 'empty',
        });
        return;
      }
      cacheSet(cacheKey, out);
      send(200, { ok: true, source: 'ai', cached: false, model, ...out });
    });
    return true;
  }

  return false;
}

module.exports = { handleAiApi };
