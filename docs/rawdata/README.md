# rawdata — 구조화 원천 데이터 (AI 입력용)

> **목적**: 이 폴더(`docs/rawdata/screens/*.yaml`)는 **스토리보드 · 요구사항명세서 · 버튼 단위 프론트/백엔드 로직**을
> AI가 자동 생성하기 위한 **구조화 원천 데이터**다. AI가 파싱하기 쉽도록 스키마 기반 YAML로 통일한다.
>
> - 산문 지식(사람용): 상위 `docs/*.md`, `docs/인사이트/`, `docs/수행원가/`
> - **구조화 rawdata(AI 입력): 이 폴더** ← 이것으로 AI가 최종 산출물을 생성
> - **표준 예시(canonical)**: [`screens/ai-report.yaml`](screens/ai-report.yaml) — 새 화면 YAML은 이 구조를 그대로 따른다.
>
> **📢 작성 가이드 원문**: [`목업작성가이드.md`](목업작성가이드.md) — 개발팀 공지(지니(Jinny) 규칙). 새 화면은 **코드+YAML+md 3종 세트**로 만들고, 아래 스키마의 **`crud` 필드는 필수**다.

## 파일 규칙
- 화면 1개당 YAML 1개 (`screens/<화면>.yaml`). 탭/계정은 별도 파일.
- **영문 key**(안정적 파싱) + **한국어 value**. 로직은 `file:function`(가능하면 라인) 근거 인용.
- 함수가 여러 번 override된 코드는 **실제 동작하는 최종 유효본** 기준으로 기술.

## 스키마 (키 정의)

```yaml
screen:            # 화면 메타
  id:              # DOM screen id (예: s-ai-report)
  name:            # 화면명
  menu_path:       # 메뉴 경로
  route:           # 해시 URL (딥링크 파라미터 포함, 예: "#/insights/progress?pj=<id>")
  entry:           # 진입 함수 체인
  source_files: [] # 관련 소스 파일 + 역할 주석
  purpose:         # 한 줄 목적

states: []         # 화면 상태: {id, when(조건), shows[], effect/note}

elements:          # ★ 버튼/입력/링크/칩 인벤토리 (요소 단위 로직) — 하나도 빠짐없이(그리드 컬럼까지)
  - id:            # 요소 식별자 (예: btn-save-budget)
    label:         # 표시 라벨 — CRUD 동사 명확히(저장/등록/수정/삭제/조회/검색)
    type:          # button/input/link/chip/toggle/grid 등
    crud:          # ★ 필수: C(등록) / R(조회·검색·다운로드) / U(수정·편집·저장변경) / D(삭제) / N(이동·팝업·토글)
    area:          # 화면 영역
    dom_id:        # (선택) DOM id
    event:         # onclick / onkeydown(Enter) 등  ← 버튼은 인라인 onclick="handler()"로 연결(CRUD 감지)
    front:         # 프론트 로직
      handler:     #   호출 함수(인자 포함) — 실제 함수명만(코드에 없는 함수 지어내기 금지)
      file:        #   소스 파일
      logic:       #   동작 요약
      validation:  #   검증 규칙
      state_writes: [] # 변경하는 상태 변수
    backend:       # 백엔드 연동 (없으면 null)
      api:         #   경로
      method:      #   GET/POST
      request:     #   요청 스키마
      response:    #   응답 스키마
      server_logic:#   서버 처리 요약
      security:    #   보안 규칙
    result:        # 결과/화면 전이

apis: []           # 화면이 쓰는 API 상세 {path, method, handler, request, response, pipeline[], security[]}
data:              # 데이터
  state_vars: []   #   상태 변수 {name, shape, file, purpose}
  datasets: []     #   데이터셋/목업 {name, file, note}
flows: []          # 대표 사용자 플로우 {name, steps[]}
requirements: []   # 요구사항 후보 {id, text}  (SRS 변환용)
```

## 커버 화면 목록

| 파일 | 화면 |
|---|---|
| `screens/ai-report.yaml` | AI 레포트 (LLM→SQL) ✅ 표준예시 |
| `screens/main-home.yaml` | 메인 홈 (My Work) |
| `screens/chat-navigator.yaml` | 메인 채팅 AI & 화면 네비게이터 |
| `screens/insights-overview.yaml` | 인사이트 · 종합현황 |
| `screens/insights-progress.yaml` | 인사이트 · 원가 소진율 |
| `screens/insights-version.yaml` | 인사이트 · 버전별 예산 |
| `screens/custom-report.yaml` | 맞춤 레포트 (필드선택 + AI 도우미) |
| `screens/budget-status.yaml` | 수행원가 · 원가현황 |
| `screens/budget-adjust.yaml` | 수행원가 · 원가조정 |
| `screens/budget-history.yaml` | 수행원가 · 변경이력 |
| `screens/budget-labor.yaml` | 원가조정 · 인건비 |
| `screens/budget-outsource.yaml` | 원가조정 · 외주비 |
| `screens/budget-material.yaml` | 원가조정 · 재료비 |
| `screens/budget-expense.yaml` | 원가조정 · 경비 |
| `screens/budget-as.yaml` | 원가조정 · A/S Cost |
| `screens/project-mgmt.yaml` | 프로젝트 관리 (수주형/제안) |
