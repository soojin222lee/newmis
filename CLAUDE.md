# CLAUDE.md — Claude Code 작업 규칙

이 파일은 Claude Code가 이 저장소에서 작업할 때 자동으로 읽는 규칙입니다.
상단바 **📋 그라운드 룰** 팝업의 내용을 코드로 옮겨둔 것이라, 매번 시작 프롬프트를 붙여넣지 않아도 됩니다.
팝업 내용이 바뀌면 이 파일도 함께 갱신하세요.

---

## 팀 그라운드 룰

이 저장소는 **비개발자 바이브코딩** 환경입니다. 사용자는 git 명령어를 몰라도 되며,
Claude가 아래 규칙을 대신 지킵니다.

### 🌿 브랜치 룰

- 각자 **자기 이니셜 브랜치**(`feature/sj` · `feature/cj` · `feature/sw` …)에서만 작업합니다.
  **매번 새 브랜치를 만들지 않고** 자기 브랜치를 계속 재사용합니다.
- **작업 시작 전 develop 최신을 자기 브랜치로 받습니다.** 브랜치는 자동 동기화되지 않습니다.
  ```bash
  git fetch --prune
  git merge origin/develop
  ```
  이 방향(develop → 내 브랜치)은 **지시 없이 먼저 해도 되는 유일한 git 동작**입니다.
  받은 뒤 충돌 여부와 들어온 변경을 한 줄로 보고하고 본 작업을 시작합니다.
- **`develop` · `main` 에 직접 커밋 금지.** 커밋은 언제나 자기 브랜치에만 합니다.
- **`main` 은 쓰지 않습니다 → `develop` 이 최종본입니다.**
  `main` 이 수백 커밋 뒤처져 있어도 정상이며, 릴리스 지연이 아닙니다.

### ✍️ 커밋 메시지 룰

**한 줄**로 씁니다. 여러 줄 본문이나 `feat:` 같은 Conventional Commits 접두사를 쓰지 않습니다.

```
[화면경로] 요약 - 이름
```

- 화면경로는 **상단 메뉴 기준**으로 씁니다: `[수행원가>원가조정>외주비]`
- 전역·문서·설정처럼 특정 화면이 아니면 **`[공통]`** 을 씁니다.
- 시간·유형은 생략하고 간단히 씁니다.
- 요약이 길면 본문을 만들지 말고 **한 줄 안에서 `—` 로** 덧붙입니다.
- `Co-Authored-By: Claude ...` 트레일러는 함께 남깁니다.

실제 예시:

```
[프로젝트>제안프로젝트] 화면 추가 - 수진
[수행원가>원가조정] 계정별 URL 분리 - 수진
[공통] 그라운드 룰 팝업 개편 — 브랜치·커밋 규칙 + Claude 시작 프롬프트 - 수진
[수행원가>원가조정>외주비] 업체별 예산 1행 + PO N건 구조로 재설계 - 석완
```

| 이니셜 브랜치 | 이름 |
|---|---|
| `feature/sj` | 수진 |
| `feature/cj` | 정진 |
| `feature/sw` | 석완 |

### 🤖 git 동작 권한

**커밋 · 푸시 · develop 머지(PR)는 사용자가 시킬 때만** 실행합니다. 먼저 하지 않습니다.

작업이 끝나면 커밋하지 말고 **"커밋 준비됨 + 제안 메시지"** 만 제시합니다.

| 동작 | 지시 없이 가능? |
|---|---|
| develop → 내 브랜치 병합 | ✅ 작업 전 자동 |
| 커밋 | ❌ 지시할 때만 |
| 푸시 | ❌ 지시할 때만 |
| 내 브랜치 → develop (PR·머지) | ❌ 지시할 때만 |

---

## 공유 파일 규칙

`CONTRIBUTING.md` 의 "화면 = 파일 = 담당자" 표가 원본이며, 요점은 다음과 같습니다.

**자기 화면의 js/css 파일만 수정합니다.** 아래 공유 파일은 다른 담당자의 화면을 깨뜨릴 수 있으므로
**수정하지 말고, 전용 파일로 우회하는 방법을 먼저 찾습니다.**

- `public/index.html` — 네비 · 화면 div · script/link 태그
- `public/js/app.js` — 라우터 · 전역 · `SCREEN_ROUTES` / `ROUTE_ACTIONS`
- `public/css/sk-theme.css` — 전역 토큰 · 상단바 · 공통 버튼
- `public/js/budget-status.js` + `-2` ~ `-5` — 수행원가 공유 렌더러 (로드 순서 1→5 필수)
- `public/js/budget-area-routes.js` — 계정↔슬러그 매핑 · 딥링크 라우트

### 우회 기법

빌드 없는 바닐라 JS SPA라 **모든 스크립트가 하나의 전역 스코프를 공유하고, 뒤에 로드된 코드가 앞을
override** 합니다. `budget-area-*.js` 는 `budget-status-*.js` 전부 뒤에 로드되므로 항상 이깁니다.

**1. 데코레이터 체인** — 자기 계정만 처리하고 나머지는 이전 정의로 위임합니다.

```js
var renderXBefore = renderX;
renderX = function(data, account) {
  if (account !== CATS[1]) return renderXBefore(data, account);
  // 내 계정 전용 처리
};
```

**2. 공유 렌더러 재정의** — 공유 함수가 지워야 할 문구를 품고 있으면 전용 파일에서 다시 정의합니다.
버튼·래퍼 클래스는 재사용해 모양을 유지합니다.

**3. 인라인 `!important`** — `sk-theme.css` 의 포괄 카드 규칙(`.setup-editor` · `.account-monthly-card` 등에
`border`/`background`가 `!important`로 걸려 있음)은 **인라인 style의 `!important`로만** 덮입니다.
렌더 시점에 자기 요소에만 붙이면 공유 CSS를 건드리지 않고 자기 화면만 바꿀 수 있습니다.

**4. 전용 CSS 주입** — 새 클래스가 필요하면 공유 CSS 대신 자기 js 파일에서 `<style>` 을 주입합니다.
클래스 이름에 화면 접두사를 붙이고(`.osv3-*`), 중복 주입을 막습니다.

```js
(function injectStyle() {
  if (document.getElementById('my-style')) return;
  const style = document.createElement('style');
  style.id = 'my-style';
  style.textContent = `...`;
  document.head.appendChild(style);
})();
```

---

## 📢 목업 = 지니(Jinny) 근거 데이터 (화면당 3종 세트)

이 목업은 **지니**가 읽어 요구사항명세서·UI설계서를 자동 생성하는 근거가 됩니다.
지니는 화면 소스가 아니라 **rawdata(YAML) + 컨셉(md)** 를 근거로 산출물을 만들므로,
**화면 1개를 만들거나 크게 고칠 때는 아래 3종을 함께** 작성/갱신합니다.

1. 화면 코드 `public/js/<screen>.js`
2. rawdata YAML `docs/rawdata/screens/<screen>.yaml`
3. 화면 컨셉 md `docs/<번호>-<화면>.md`

**필수 규칙 (자세한 내용·스키마는 [`docs/rawdata/목업작성가이드.md`](docs/rawdata/목업작성가이드.md) — 공지 원문):**

- **버튼은 인라인 `onclick="handler()"`** (addEventListener 금지) — 지니 CRUD 감지용.
- **버튼 `label`에 CRUD 동사** 명확히(저장/등록/수정/삭제/조회/검색).
- YAML `elements`에 **버튼·입력·칩·토글·그리드 컬럼까지 누락 0**, 각 요소에 **`crud`(C/R/U/D/N) 필수**.
  - C=등록, R=조회·검색·다운로드, U=수정·편집·저장(변경), D=삭제, N=이동·팝업·토글.
- `handler`·`api`는 **실제 코드와 일치**(지어내기 금지). 목업 스텁이면 `logic: "목업 스텁, 동작 없음"`.
- `requirements`에 **`FR-<화면약자>-NN` 5~10개**, "~할 수 있어야 한다" 톤.
- 영문 key + 한국어 value, 로직은 `file:function` 근거 인용. 표준 예시: `docs/rawdata/screens/ai-report.yaml`.

> 공지 원문이 바뀌면 `docs/rawdata/목업작성가이드.md` · `docs/rawdata/README.md` · 이 섹션을 함께 갱신하세요.

---

## 실행 · 확인

```bash
npm start        # = node server.js → http://localhost:57291
```

변경이 화면에 안 보이면 **Ctrl+Shift+R** 로 하드 리로드하세요 (`?v=` 캐시 버스팅).

빌드도 테스트 프레임워크도 없으므로, 렌더 로직을 크게 바꿀 때는 Node `vm` 으로 공유 코어를 스텁 처리해
반환 HTML을 검사하는 임시 검증 스크립트를 만들어 확인합니다. 다만 DOM·CSS가 없어 **실제 화면 확인은
브라우저로 해야 합니다.**
