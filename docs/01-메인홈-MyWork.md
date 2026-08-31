# 메인 홈 (My Work)
> 요구사항명세서 Agent 입력용. 비즈니스 로직·프론트/백엔드 로직·데이터·플로우를 코드 근거로 정리.

> ⚠️ 근거 규칙: `public/js/dashboard.js`는 동일 함수(`initDashboard`, `renderPmDashboard`, `homeSignalBlockHtml`, `homePjtStripHtml`, `homePjtModalHtml`, `openImpactDrawer`, `feedReflectApply`, `rerenderHomeFeed` 등)를 여러 번 재정의(override)한다. 파일 상단 주석(1484~1491, 1916~1920행) 및 프로젝트 규칙("뒤에 정의된 코드가 앞을 override")에 따라 **파일에서 가장 마지막에 정의된 버전이 실제 동작**한다. 본 문서는 최종 유효 버전 기준으로 작성한다. `app.js`의 `openAiChat`/`routeIntent`도 동일 규칙(최종 정의 = 2132행 `openAiChat`, 2074행 `routeIntent`).

## 1. 개요 (목적/사용자/핵심가치)
- 목적: SI 프로젝트 예산관리(원가관리) 담당자의 첫 화면(My Work). 담당 프로젝트에서 "확인이 필요한 것"을 모아 보여주고, AI 채팅으로 원인 분석·화면 이동·업무 실행까지 연결한다.
- 사용자: PM(일반 구성원) · 팀장(`dashboardRole` 값 `'pm'` / `'lead'`, `dashboard.js:438`). 기본값은 `'pm'`.
- 핵심가치(코드 근거):
  - 선행 시스템(CRM·AI PMO·SCM·구매)에서 받은 이벤트 중 AI가 자동 반영한 건과, 사람이 확인해야 할 건을 분리 제시 (`HOME_EVENT_TOTAL` 18건 중 `HOME_AUTO_COUNT` 12건 자동, 나머지 6건 = `HOME_FEED`, `dashboard.js:1061~1062`).
  - 최종 유효 메인화면(`renderPmDashboard`, `dashboard.js:1962`)은 "구글 첫 화면처럼 단순화"(6차 주석 `dashboard.js:1483`) 결과로 인사말 + 프로젝트 캐러셀 + AI 검색창만 남았다. 재무 요약·Headroom·Runway·월마감 사이클·Work Feed 목록은 화면에서 제거되고 PJT 팝업/상세로 재사용된다.

## 2. 진입 경로 & URL
- 화면 컨테이너: `#s-main` (`dashboard.js` 각 `initDashboard`가 `document.getElementById('s-main').innerHTML`에 렌더).
- 진입 함수: `showMain()` (`app.js:167`) — `setScreen('s-main')`, `setNav('nav-main')`, `updateKpiMain()` 호출. `updateKpiMain`은 현재 no-op(`dashboard.js:298`, KPI 카드 제거됨).
- 홈 실렌더: `initDashboard()`(최종 유효본 `dashboard.js:453`)가 `dashboardRole === 'lead' ? renderLeadDashboard() : renderPmDashboard()` 분기.
- 메인 복귀 동선: 상단 로고(`.tb-brand`)에 `showMain()`이 걸려 있음(`home.css:573` 주석). AI 채팅에서 "메인/홈으로" 입력 시 `routeIntents`가 `showMain()` 호출(`app.js:2025~2029`).
- 별도 URL 라우팅은 홈에 없음(채팅 네비게이터가 다른 화면으로 갈 때 `#/...` 해시 사용, `app.js:1242~1244`).

## 3. 화면 구성 (UI 요소)
최종 유효 `renderPmDashboard()`(`dashboard.js:1962`) 기준. 루트 클래스 `ai-workspace home2 home-simple`.
- 히어로: `<h1>좋은 아침이에요, 봄님</h1>` (인사말만, 브리핑 문구는 최종본에서 제거됨).
- `#home-under`: 프로젝트 캐러셀 영역(`homePjtStripHtml()` 최종본 `dashboard.js:1923`).
  - 요약 줄(`hm-under-head`): "담당 프로젝트 N" + "확인 필요 N건"(`homeOpenCount()`).
  - 좌/우 화살표(`scrollHomeTabs(-1/1)`, `dashboard.js:559`)와 트랙(`#hm-ptabs-track`).
  - 프로젝트 칩(`hm-ptab hm-pjt-chip`): 이름 + 빨간 숫자공 배지. 확인건수 0이면 `calm`(흐리게), 선택 시 `picked`(✓ 표시).
  - 선택 문맥 줄(`hm-ctx`): 선택된 프로젝트명 표시 + `✕`(해제, `clearHomePjt()`). 미선택 시 `hm-ctx off`.
- AI 검색창(`home2-search`): 로봇 아이콘(SVG) + `input#ai-main-query` + 전송 버튼(↑). Enter 또는 버튼 → `askFromHome()`.
- 오버레이 2개(초기 비표시):
  - `#home-impact-drawer` (`hm-drawer-overlay`): 영향 미리보기/근거 원장/자동처리 내역 드로어.
  - `#home-pjt-modal` (`hm-modal-overlay`): PJT 확인항목 팝업.
- 상단바 메뉴 토글 버튼(`#tb-menu-toggle`, ☰): `.tb-right`에 JS로 주입(`dashboard.js:1894`). GNB 메뉴는 기본 숨김(`home.css:577`), 토글 상태는 localStorage `newmis.menuShown`에 저장(`dashboard.js:1868~1874`).

팀장 화면(`renderLeadDashboard`, `dashboard.js:1218`): 인사말·요약 그리드(관리 4/주의 3/승인 지연 2)·채팅창·AI 판단 카드 3개·AI 추천 조치·바로가기. 역할 전환(`renderRoleSwitch`)은 팀장 화면에만 노출.

## 4. 비즈니스 로직 & 규칙 (계산식·필터·상태전이)
### 확인 필요 건수
- `homeOpenCountOf(id)`(`dashboard.js:1500`): `HOME_FEED` 중 `proj===id` && 처리 안 된(`!homeFeedState[feedKey(i)]`) 항목 수. → 칩 빨간 배지.
- `homeOpenCount()`(`dashboard.js:1085`): 전체 미처리 건수. → 상단 요약.
- `homeInsightCount(id)`(`dashboard.js:548`): 처리 여부 무관 전체 건수(초기 탭 배지용, 최종 캐러셀에서는 미사용).

### 카드 상태 전이 (`homeFeedState[key]`)
- 초기: 미정의 → 일반 카드 노출.
- `'done'`(확인 완료): `feedAct(key,'done')`(`dashboard.js:997`) → 회색 완료 카드.
- `'reflected'`(원가 조정안 반영): `feedReflectApply(key)`(최종본 `dashboard.js:1634`) → "수행원가 조정안(Draft V5)에 반영" 완료 카드. 팝업 열려 있으면 `homePjtModalRerender()`, 아니면 `closeImpactDrawer()`.
- key 생성: `feedKey(it)` = `it.proj + '|' + it.title`(`dashboard.js:545`).

### 재무 요약 계산 `homeFinOf(id)` (`dashboard.js:1337`)
입력: `HOME_FIN`(프로젝트별 계약금액 `cp`, 당월 gap `mgap`, 계정별 `[명, 계획, 실적]`, 단위 억원).
- `id==='all'`이면 담당 전체(`HOME_PROJECTS`의 모든 id) 합산, 아니면 단일.
- 계정별: `left = plan - act`; 여력 `pct = plan ? left/plan*100 : 0`; 등급 `lv = finLv(pct, plan)`.
- 합계: `cp` 합, `mgap` 합, `plan`/`act` 합, `left = plan-act`.
- `rate`(예상 원가율) = `plan/cp*100`; `exec`(집행률) = `act/plan*100`.
- `finLv(pct, plan)`(`dashboard.js:1329`): plan 없으면 `'na'`, pct<10 `'risk'`, pct<20 `'warn'`, 그 외 `'ok'`.
- 원가율 태그 등급(`homeFinSummaryHtml`, `dashboard.js:1361`): rate≥85 `risk`, ≥80 `warn`, 그 외 `ok`. 관리 기준선 85%.
- 포맷터: `finAmt`(1억 이상은 `x.xx억`, 미만은 만원, `dashboard.js:1317`), `finSigned`(부호+금액), `finPct`(소수1자리%).
- ※ 최종 유효 메인화면에는 재무 요약이 렌더되지 않으나, PJT 팝업 헤더 메타(`homePjtModalHtml` 초기본)·`chatPjtContext`(LLM 컨텍스트)에서 `homeFinOf` 재사용.

### Runway (`homeRunwayHtml`, `dashboard.js:1403`)
- 선택 PJT 계정 중 `plan>0`인 것에서 여력 pct 최저 계정(`worst`)을 찾음.
- `worst.pct>=20` 또는 매핑(`HOME_RUNWAY_BY`) 없으면 `calm`(여유), 아니면 "○월에 바닥납니다".

### AI 결정 큐/정렬
- `homeAiOf(it)` = `HOME_AI[feedKey(it)]`(`dashboard.js:801`). 등급 grade: D(확정)·R(규칙기반)·P(예측).
- 정렬 `homeSortFeed`(`dashboard.js:803`): `homeSort` 값 `base`(원순서)/`impact`(impactWon 내림)/`due`(dueDays 오름)/`risk`(impactWon/dueDays 내림).

### 프로젝트 캐러셀 정렬
- `homePjtStripHtml`(최종 `dashboard.js:1924`): To-Do 많은 순(`homeOpenCountOf` 내림) → 이름순(`localeCompare`).

### 자동 처리 절감시간
- `homeFootHtml`/자동 드로어: `saved = HOME_AUTO_COUNT * HOME_AUTO_MIN_PER`(12×8=96분), 시/분 환산 표기(`dashboard.js:1104,1140`).

## 5. 프론트엔드 로직 (주요 함수/상태/이벤트 — 파일:함수 인용)
### 전역 상태 (`dashboard.js`)
- `dashboardRole`(438): `'pm'`|`'lead'`. `switchDashboardRole(role)`(440) 설정 후 `initDashboard()` 재렌더.
- `homeSelectedProject`(538): 초기 `'all'`. 선택된 프로젝트 id(대화 문맥). 최종 `renderPmDashboard`는 초기화하지 않음(주석 "화면 다녀와도 유지", 1963행).
- `homeCat`(539): 초기 `'all'`. 카테고리 필터(`budget`/`work`) — 최종 메인에는 필터 UI 없음(팝업은 카테고리별 렌더).
- `homeFeedState`(540): `{ feedKey → 'reflected' | 'done' }`.
- `homeSort`(795), `homePjtModalProj`(1538), `impactDrawerKey`(1004).

### 프로젝트 칩 상호작용 (요구 핵심)
`homePjtStripHtml`(최종 `dashboard.js:1923`)이 칩을 생성:
- 칩 본체 클릭 → `selectHomePjt(id)`(`dashboard.js:1766`): 같은 id면 토글 해제(`'all'`), 아니면 선택. `#home-under`만 부분 재렌더. 선택은 이후 AI 답변의 문맥이 됨.
- 빨간 숫자공 배지 클릭 → `openHomePjtModal(id)`(`dashboard.js:1540`): 배지에 `onclick="event.stopPropagation();openHomePjtModal(...)"`가 있어 **이름 클릭(선택)과 숫자 클릭(팝업)이 분리**됨. 배지에 `role="button" tabindex="0"` + Enter/Space 키 핸들러도 부여(접근성).
- 배지 클릭 시각 강조 CSS: `.hm-ptab-badge.clickable:hover`(`home.css:794`).
- `clearHomePjt()`(1771): 선택 해제 = `selectHomePjt(현재선택)`.

### PJT 팝업 (`openHomePjtModal` → `homePjtModalHtml`)
- 최종 유효 `homePjtModalHtml`(`dashboard.js:1818`): 해당 PJT의 **미처리** `HOME_FEED` 항목을 `homePjtSlimCard`(1845)로 렌더(태그·제목·핵심수치 한 줄, AI 추천 변경안 없음). 하단 버튼: 닫기 / 원가 현황으로 이동(`openCostStatus`) / 원가 조정으로 이동(`openCostAdjust`).
- `closeHomePjtModal()`(1547), `homePjtModalRerender()`(1552).
- ※ 초기 버전(1558)은 재무 메타 + 상세 전환(`homePjtDetailHtml`)을 포함하나 최종본이 override.

### Work Feed 렌더 (팝업/초기 화면에서 사용)
- `feedCard(it)`(892): 상태 분기 → `feedBudgetCard`/`feedWorkCard`.
- `feedCardHead`(921): 태그·프로젝트명·메타칩(`feedMetaChipsHtml`)·제목·요약. 헤더 클릭 = `toggleFeedCard(this)`(543, 클래스 토글로 펼침).
- `feedActionsHtml`(912): `aiPlanHtml`(AI 추천 변경안) + primary/secondary 버튼(`feedAct`).
- `feedAct(key, act)`(987): `cause`→`openAiChat('main', 질문)`, `status`→`openCostStatus`, `adjust`→`openCostAdjust`, `history`→`openCostHistory`, `impact`/`reflect`→`openImpactDrawer`, `done`→상태전이+토스트, `detail`/`later`→토스트.
- 드로어: `openImpactDrawer`(최종 `dashboard.js:1619` — 팝업 열려 있으면 팝업 안 `homePjtDetailHtml`로, 아니면 `#home-impact-drawer`), `openEvidenceDrawer`(861, 근거 원장), `openAutoDrawer`(1121, 자동처리 내역).

### 재렌더
- `rerenderHomeFeed()`(최종 `dashboard.js:1997`): `#home-under`만 `homePjtStripHtml()`로 갱신(제거된 영역은 미갱신).

### 검색/채팅 진입 (요구 핵심)
- `askFromHome()`(`app.js:429`): `#ai-main-query` 값을 읽어 비우고 `openAiChat('main', q || undefined)`.
- `askExample(text)`(`app.js:435`): 예시 프롬프트 → `openAiChat('main', text)`.
- `openAiChat(entry, initialQuery)`(최종 `app.js:2132`): 채팅 오버레이(`#ai-chat-overlay`) 열고, `initialQuery` 있으면 입력창에 넣고 `sendAiChat()` 자동 실행.
- `sendAiChat()`(`app.js:2081`): `routeIntents(text)`로 담당 Agent 목록 산출 → 각 Agent가 순차 렌더. `q`(LLM)만 있고 `navi` 없으면 `navToRelevant`로 관련 화면 이동.

## 6. 백엔드/API/LLM 연동
프론트는 vanilla JS + `fetch`. 서버 엔드포인트(`app.js`):
- `POST /api/chat`(`askLLMAnswer`, `app.js:1204`): body `{ question, context: chatPjtContext() }`. 응답 `llmAnswerHtml`, 실패 시 `qGenericHtml` 폴백.
  - `chatPjtContext()`(`app.js:1141`): 선택 프로젝트(`homeSelectedProject`)명 + `homeFinOf(id)` 파생 재무(cp/plan/act 등)를 LLM 컨텍스트로 전달.
- `POST /api/navigate`(`app.js:1285,1298`): 자연어 → 화면 딥링크 후보(`NAV_ROUTES`, `app.js:1216`) 중 선택.
- `GET /api/risks`(`app.js:23`): 이상징후 목록.
- 인텐트 라우팅(로컬 규칙, 서버 아님): `routeIntents(text)`(`app.js:2021`) — 메인복귀/네비게이션/확인사항(risk+todo)/`INTENT_RULES`(1982, nav·risk·auto·trust·todo·whatif·outsource·rate·compare) 매칭, 최대 `INTENT_MAX`(3)건. 미매칭 이동의도→`navi`, 그 외→`q`(LLM). Agent 로스터 `AGENTS`(`app.js:419`: navi/q/pilot).

## 7. 데이터 모델 (주요 구조·필드 의미)
### `HOME_PROJECTS` (`dashboard.js:460`)
담당 프로젝트 9개. 각: `{ id, no(프로젝트번호), name }`. 예 `{id:'skon', no:'30131234-D001', name:'SKON 통합 관제 플랫폼'}`.

### `HOME_FEED` (`dashboard.js:475`) — "확인이 필요한 것"
항목 공통: `cat`(`'budget'` 예산 점검=MIS 내부 시그널 / `'work'` 업무 반영=외부 이벤트→원가영향→액션), `proj`(HOME_PROJECTS id), `sub`(세부구분: 이상징후/정합성/SCM/구매/ERP), `sev`(`danger`/`warning`/`info`), `title`.
- budget형: `change`{fromL,from,toL,to,deltaL,delta,pct} 또는 `dual`{leftL..} + `impact`/`note`.
- work형: `flow`{sL,sSub,sVal,sDelta / iL,iSub,iVal / aL,aSub,aVal}(Source→Change→Impact→Action).
- 공통: `preview`{title,date,mode(`impact`|`reflect`),rows[[항목,현재,확정,증감]],forecast{cost[],rate[]},warning,(reflect시)draft,done{...}}.
- `primary`{label,(ai),act,(q)}, `secondaries`[{label,act}].

### `HOME_AI` (`dashboard.js:711`) — feedKey별 AI 추천/근거
`{ grade(D/R/P), src, impact, impactWon(정렬용 만원), dueDays, dueNote, plan[[항목,전,후,증감]], guard[[ok/warn,문구]], evidence[[제목,내용]] }`. `HOME_GRADE`(792) 라벨 매핑.

### `HOME_FIN` (`dashboard.js:1304`) — 프로젝트별 재무(억원)
`{ cp(계약금액), mgap(당월 계획-실적 gap), acc:[[계정명, 수행원가 계획, 실적], ...] }`. 계정: 인건비/외주비/재료비/경비/A/S Cost. 잔여·여력%·원가율은 전부 파생 계산(수치 불일치 방지, 주석 1303).

### 신호 레이어 데이터 (메인 최종본에서는 미렌더, 함수 재사용용)
- `HOME_HEADROOM`(569), `HOME_RUNWAY`(577)/`HOME_RUNWAY_BY`(1398), `HOME_RAIL`(583), `HOME_SIGNAL`(593), `HOME_CYCLE`(1428)+`HOME_CYCLE_OWN`(1436).

### 자동 처리 데이터
- `HOME_EVENT_TOTAL`=18, `HOME_AUTO_COUNT`=12, `HOME_AUTO_MIN_PER`=8, `HOME_AUTO_WEEK`=47 (`dashboard.js:1061~1064`).
- `HOME_AUTO_LOG`(1067): `{time,sys,grade(D/R),title,desc,proj}`. `HOME_SYSTEMS`(1076): `{name,state(ok/wait),note}`(CRM·AI PMO·SCM·구매·ERP·BIX).

## 8. 사용자 플로우 (대표 시나리오 단계별)
### A. 프로젝트 선택 후 AI에게 문맥 질문
1. 홈 진입(`showMain`→`initDashboard`→`renderPmDashboard`). 캐러셀에 담당 9개 표시(To-Do 많은 순).
2. 프로젝트 칩 이름 클릭 → `selectHomePjt('skon')` → `picked`(✓), 문맥 줄에 "선택된 프로젝트: SKON..." 표시.
3. 검색창에 "외주비 왜 늘었어?" 입력 + Enter → `askFromHome()` → `openAiChat('main', text)` → `sendAiChat` → `routeIntents` outsource 규칙 매칭 → `qOutsourceHtml`. LLM 경유 시 `chatPjtContext`에 선택 프로젝트(skon) 재무 포함.

### B. 확인 항목 팝업에서 반영
1. 칩의 빨간 숫자공 클릭 → `event.stopPropagation()`로 선택과 분리 → `openHomePjtModal('skon')`.
2. 팝업(`homePjtModalHtml`)에 미처리 항목을 `homePjtSlimCard`로 나열(태그·제목·임팩트·D-day).
3. "원가 조정으로 이동" 클릭 → `closeHomePjtModal()` + `openCostAdjust('budgetMock')`.
   (초기 상세 버전 경로: 카드 impact/reflect → `openImpactDrawer` → reflect면 `feedReflectApply`로 `homeFeedState='reflected'`, 배지 건수 감소.)

### C. 자동 처리 내역 확인
1. (해당 UI가 있는 버전) "자동 처리 내역 N건 보기" → `openAutoDrawer()` → `#home-impact-drawer`에 `HOME_AUTO_LOG`·후행 전송 상태·절감시간 표시.

### D. 역할 전환(PM ↔ 팀장)
1. 팀장 화면의 `renderRoleSwitch` 버튼 → `switchDashboardRole('lead'/'pm')`(`dashboard.js:440`) → `initDashboard()` 재렌더.

## 9. 관련 소스 파일 (목록+역할)
- `public/js/dashboard.js` — 홈 메인 렌더/상태/데이터의 본체. 최종 유효 `renderPmDashboard`(1962), `homePjtStripHtml`(1923), `homePjtModalHtml`(1818), 프로젝트 칩(`selectHomePjt`/`openHomePjtModal`), 재무(`homeFinOf`/`HOME_FIN`), Work Feed(`HOME_FEED`/`feedCard`/`feedAct`), 자동처리 드로어, 팀장 화면(`renderLeadDashboard`), 상단 메뉴 토글.
- `public/js/app.js` — 화면 전환(`showMain` 167)·AI 채팅(`askFromHome` 429, `openAiChat` 최종 2132, `sendAiChat` 2081)·인텐트 라우팅(`routeIntents` 2021, `INTENT_RULES` 1982)·LLM/네비 API(`askLLMAnswer` 1201, `chatPjtContext` 1141, `NAV_ROUTES` 1216)·Agent 로스터(`AGENTS` 419).
- `public/css/home.css` — 홈 전용 스타일. 캐러셀/칩/배지(`.hm-ptab*`, `.hm-ptab-badge.clickable` 794), 팝업(`.hm-modal-overlay`/`.hm-pm*`), 드로어(`.hm-drawer*`), 선택 문맥(`.hm-ctx`), GNB 숨김/토글(577, 663), 신호 레이어/재무(`.hm-fin*`, `.hm-hr*`, `.hm-cy*`).

작성 완료: C:\Workspace\budget\docs\01-메인홈-MyWork.md
