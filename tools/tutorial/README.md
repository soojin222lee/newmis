# 업무 튜토리얼 (인터랙티브 오버레이)

실제 MIS 목업 **화면 그대로** 위에 스포트라이트·말풍선만 얹어, 사용자가 직접 클릭하며
업무 흐름을 익히는 게임식 튜토리얼입니다. 화면/업무 로직은 **전혀 바꾸지 않습니다**(오버레이만 추가).

좌측 레일 **업무 프로세스** 팝업(`public/js/process-map.js`)의 각 단계에서 **▶ 체험 / ⬇ 다운로드** 할 수 있습니다.

## 구성

| 파일 | 역할 |
|---|---|
| `tutorial-engine.js` | 공용 엔진 — 스포트라이트, 말풍선(드래그 이동), 배경 스크롤 잠금(고정), 진행바/이전/다시 시작, 인트로·완료 카드, 잘못 클릭 안내 |
| `tutorial-config-labor.js` | 인건비 계획 수립(SCM 인력·MM·P등급·이관·OT·소급 제약) |
| `tutorial-config-si.js` | 수주형 프로젝트 등록 |
| `tutorial-config-wg.js` | WG·사내 개설(신청→기안·승인→등록) |
| `tutorial-config-version.js` | 실행예산 버전 관리(확정 스냅샷·버전 업·저장/승인요청·과거월=실적/미래월=계획) |
| `tutorial-config-close.js` | 프로젝트 종료(기간+30일 자동 배치 종료·조건) |
| `tutorial-outsource.html` | **외주비(실투입)** — 자립형 시뮬레이션 튜토리얼(POP↔실행예산 2개 시스템, 시나리오 A~E). 실제 앱 인라인이 아니라 단독 HTML이므로 `build-tutorial.js` 대상이 아니며, 수정 시 `public/tutorials/tutorial-outsource.html` 로 복사한다. |
| `build-tutorial.js` | 실제 목업(CSS+JS 전체) 인라인 + 엔진 + 설정 → 단독 HTML 생성 |
| `build-all.sh` / `build-all.cmd` | 4종 전체 재생성 |

## 재생성

```bash
# 전체
node tools/tutorial/build-all.sh        # (Windows: tools\tutorial\build-all.cmd)

# 개별
node tools/tutorial/build-tutorial.js <configFile> <다운로드파일명> <문서제목> <서버파일명>
```

산출물: `dist/<다운로드파일명>` + `public/tutorials/<서버파일명>` (→ `http://localhost:57291/tutorials/<서버파일명>`).

## 새 튜토리얼 추가

1. `tutorial-config-<이름>.js` 를 만든다. 구조:
   ```js
   (function () {
     TutovEngine({
       ready: () => typeof window.<앱전역함수> === 'function',   // 실제 앱 준비 조건
       hud: 'HUD 라벨 HTML',
       steps: [
         { ensure: () => <화면이동>(), target: () => <요소>, pos: 'bottom',
           title: '…', text: '…', mode: 'next' },     // mode: next | realclick | done
       ],
       intro: { html: '…' },   // 시작 카드(.card 내부)
       done:  { html: '…' },   // 완료 카드(.card 내부)
     });
   })();
   ```
   - `target()` 는 **실제 DOM 요소**를 반환(실제 onclick/함수로 화면 전환).
   - `realclick` 은 강조한 실제 요소를 눌러 앱을 실제로 이동시킨다.
2. `build-all` 에 한 줄 추가하고 재생성.
3. `public/js/process-map.js` 의 해당 단계 `tutorials` 배열에 `{ name, file, dl }` 추가.
