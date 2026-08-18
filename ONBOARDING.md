# New MIS 목업 — 팀 개발 온보딩

PM/예산 관리 목업(New MIS)을 화면 단위로 나눠 여러 명이 병렬로 개발합니다.
**빌드가 필요 없는 정적 SPA**라 Node.js만 있으면 바로 실행됩니다. (외부 라이브러리 없음 → `npm install` 불필요)

---

## 🤖 이 가이드를 연 Claude에게 — 자동 셋업

아래를 **순서대로 자동 수행**해서 팀원이 바로 개발을 시작할 수 있게 해줘.
각 단계 결과를 짧게 보고하고, 실패하면 멈추고 원인을 알려줘.

1. **레포 준비** — 현재 폴더에 `newmis/`가 없으면 클론하고, 있으면 그 폴더로 이동:
   ```bash
   git clone https://github.com/soojin222lee/newmis.git
   ```
2. **통합 브랜치로 전환** (`cd newmis` 후):
   ```bash
   git checkout develop && git pull
   ```
3. **개발 서버 실행** — 의존성 설치 불필요. 백그라운드로 서버를 띄우고 http://localhost:57291 미리보기를 열어줘:
   ```bash
   npm start
   ```
4. **담당 화면 확인** — `CONTRIBUTING.md`를 읽고, 팀원에게 **담당할 화면 이름**과 **본인 이름(영문)**을 물어봐.
5. **개인 작업 브랜치 생성** — 담당이 정해지면:
   ```bash
   git checkout -b feature/<화면>-<이름>   # 예: feature/insights-jieun
   ```
6. **시작 안내** — 담당 화면의 JS/CSS 파일 경로(아래 표)를 알려주고, 수정을 시작할 준비가 됐다고 안내해줘.

> **주의**
> - 이 레포는 **GitHub 접근 권한**이 필요해. 클론이 인증 오류로 실패하면, 팀원의 GitHub 계정이 레포에 초대됐는지 확인하도록 안내해줘.
> - **공유 파일**(`index.html` · `app.js` · `css/sk-theme.css`)은 수정 전 담당자와 조율이 필요하다고 반드시 알려줘.
> - `main`에는 직접 커밋하지 말고, 작업은 `develop`에서 분기한 개인 브랜치에서만 진행해.

---

## 1. 수동 셋업 (참고)

```bash
git clone https://github.com/soojin222lee/newmis.git
cd newmis
git checkout develop
npm start
```

- 접속: **http://localhost:57291**
- 변경이 안 보이면 하드 리로드(**Ctrl+Shift+R**).

## 2. 내 담당 화면 확인

루트의 **`CONTRIBUTING.md`** 에 **화면 = 소스파일 = 담당자** 표가 정리되어 있습니다.
자기 화면의 JS/CSS 파일만 수정하세요. 예:

| 화면 | screen id | JS | CSS |
|---|---|---|---|
| My Work(홈) | `s-main` | `js/dashboard.js` | `css/home.css` |
| 수행원가 · 원가현황 | `s-budget` (`#/budget-status`) | `js/budget-cost-status.js` | (공유) |
| 수행원가 · 원가조정 | `s-budget` (`#/budget-adjust`) | `js/budget-cost-adjust.js` | (공유) |
| 수행원가 · 변경 이력 | `s-budget` (`#/budget-history`) | `js/budget-cost-history.js` | (공유) |
| 인사이트 | `s-insights` | `js/insights.js` | `css/insights.css` |
| 수주형 프로젝트 | `s-si-project` | `js/si-project.js` | `css/si-project.css` |

> 수행원가의 공유 렌더링은 `budget-status.js` + `budget-status-2~5.js`가 담당하고,
> 세 하위 메뉴의 진입/라우트만 `budget-cost-*.js`가 각각 소유합니다.

## 3. 프로젝트 구조 (요점)

- `public/index.html` — 모든 화면(`.screen` div) + `<script>`/`<link>` 태그. **공유 파일**.
- `public/js/app.js` — 라우터·네비·전역 팝업·AI 에이전트. **공유 파일**.
- 화면별 JS가 자기 `#s-*` div에 `innerHTML`로 렌더합니다.
- 모든 스크립트는 **하나의 전역 스코프**를 공유하고 **로드 순서가 중요**합니다(뒤가 앞을 override).
- URL 해시 = 소스파일명. 예: `#/dashboard` · `#/budget-status` · `#/insights`.

## 4. 작업 브랜치 & PR

`develop`이 **팀 통합 브랜치**입니다. 여기서 화면별 브랜치를 따서 작업하고 `develop`으로 PR 하세요.

```bash
git checkout develop && git pull
git checkout -b feature/<내화면>-<이름>   # 예: feature/insights-jieun
```

- `main` = 안정 배포본 (직접 커밋 금지)
- 자기 소유 파일만 수정하면 병합 충돌이 거의 없습니다.
- **공유 파일**(`index.html` · `app.js` · `css/sk-theme.css`)은 수정 전 담당자와 조율하세요.

## 5. 개발 팁

- CSS 로드 순서(캐스케이드): `sk-theme.css → home.css → ai-agent.css → si-project.css → insights.css`.
  화면 전용 CSS는 `sk-theme.css` 뒤에 로드되어 전역 규칙을 안전하게 override 합니다.
- 캐시 버스팅: 변경이 반영 안 되면 `index.html`의 해당 파일 `?v=` 값을 바꾸세요.
- 새 화면 추가: `index.html`에 `div`+`script`/`link` → `app.js`에 `showXxx()` →
  `SCREEN_ROUTES`/`ROUTE_ACTIONS` 등록. 자세한 절차는 `CONTRIBUTING.md` 참고.
