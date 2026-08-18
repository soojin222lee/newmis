# 협업 가이드 — 화면 단위 병렬 작업

이 목업은 **빌드 없는 바닐라 JS 정적 SPA**입니다. `public/index.html` 하나에 모든 화면(`.screen` div)이 있고,
각 화면은 자기 JS 파일이 해당 `#s-*` div에 `innerHTML`로 렌더합니다. 모든 스크립트는 **하나의 전역 스코프**를 공유하며
**로드 순서가 중요**합니다(뒤에 로드된 코드가 앞을 override).

## 실행
```bash
npm start        # = node server.js  → http://localhost:57291
```

## 화면 = 파일 = 담당자

| 화면 | 상단 메뉴 | screen id | JS 파일 | CSS 파일 |
|---|---|---|---|---|
| My Work(홈) | My Work | `s-main` | `js/dashboard.js` | `css/home.css` |
| 수행원가 | 수행원가(원가현황/조정/이력) | `s-budget` | `js/budget-status.js` + `budget-status-2~5.js` (5분할) | `css/sk-theme.css`의 "실행예산/계정" 섹션 |
| 인사이트 | 인사이트 > 종합현황 | `s-insights` | `js/insights.js` | `css/insights.css` |
| 맞춤 레포트 | 인사이트 > 맞춤 레포트 | `s-custom-report` | `js/custom-report.js` | (공용) |
| 수주형 프로젝트 | 프로젝트 | `s-si-project` | `js/si-project.js` | `css/si-project.css` |
| W·G / 사내 / 투자 / 선투입 | 프로젝트 | `s-*-project` | `js/wg-project.js` 등 | (공용) |
| 운영 가이드 | (우측) | `s-system-desc` | `js/system-desc.js` | (공용) |
| 마스터 설정 | — | `s-master-config` | `js/master-config.js` | (공용) |
| 리스크 / 체크포인트 | — | `s-hist`, `s-cp-*` | `js/risk-history.js`, `js/checkpoint-extra.js` | (공용) |
| 단계보고(착수/중간/종료) | — | `s-initiation` 등 | `js/initiation-report.js` 등 | (공용) |
| AI 에이전트 / 우측 바로가기 | (전역 팝업) | — | `js/app.js` | `css/ai-agent.css` |
| 라우터 / 네비 / 토스트 | (전역) | — | `js/app.js` | `css/sk-theme.css` |
| 구매 참고 팝업 | ▦ 아이콘 | 별도 창 | `public/purchase-*.html` | (각 파일 내장) |

## 규칙 (충돌 최소화)

1. **자기 화면의 js/css 파일만 수정**하세요. 다른 화면 파일은 담당자와 조율.
2. **공유 파일은 조율 후 편집**: `index.html`(네비/화면 추가/스크립트 태그), `app.js`(라우터/전역), `css/sk-theme.css`(전역 토큰·상단바·공통 버튼·플랫카드).
3. **`budget-status.js`는 5분할본**(`.js`, `-2`, `-3`, `-4`, `-5`)입니다. **로드 순서 1→5 필수**(뒤 파트가 앞을 override). 각 파일 상단 헤더에 담당 영역 표기.
4. 새 화면을 추가할 때: ① `index.html`에 `<div class="screen" id="s-xxx">` + `<script>`/`<link>` ② `app.js`에 `showXxx()` ③ 전용 `xxx.js` / `xxx.css`.

## CSS 로드 순서(캐스케이드)
```
main.css → initiation-extra.css → initiation-extra2.css → sk-theme.css
         → home.css → ai-agent.css → si-project.css → insights.css
```
화면 전용 CSS는 `sk-theme.css` **뒤**에 로드되므로 전역 규칙을 안전하게 override 합니다.
`home.css`의 `.hm-ptab*`는 인사이트 프로젝트 캐러셀도 재사용하므로 `insights.css`보다 먼저 로드합니다.

## 캐시 버스팅
개발 중 변경이 안 보이면 파일의 `?v=` 값을 바꾸거나 하드 리로드(Ctrl+Shift+R) 하세요.
