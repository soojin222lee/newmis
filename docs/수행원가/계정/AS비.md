# 수행원가 > 원가조정 > A/S Cost
> SRS Agent 입력용.

## 1. 개요 (A/S 하자보수 원가)
A/S Cost(A/S비)는 프로젝트 종료 후 **하자보수(A/S) 단계에 투입될 원가**를 계획하는 계정이다. 5개 원가 계정(`CATS = ['인건비','외주비','재료비','경비','A/S Cost']`, `budget-status.js:742`) 중 마지막 `CATS[4]='A/S Cost'`에 해당한다.

일반 인건비/외주비/재료비/경비 계정이 프로젝트 본 수행 원가를 다루는 것과 달리, A/S비는 **A/S 프로젝트에 별도로 수립할 인건비·외주비·재료비·경비를 유형별 행으로 직접 입력**하고, 그 합계를 A/S비 계획 총액으로 반영한다(`renderAsCostPanel`의 안내문 `budget-area-as.js:184`).

기본 계획값은 데이터가 없을 때 `48,918,351원`으로 시딩된다(`ensureAsCostPlanAmount`, `budget-area-as.js:31`).

## 2. 진입 경로 & URL (#/budget-adjust/as?pj=)
- URL 해시: `#/budget-adjust/as` (`budget-area-as.js:2`, `budget-area-routes.js:7`)
- 프로젝트 컨텍스트는 상위 원가조정 화면과 동일하게 쿼리(`?pj=`)/`currentBudgetProj`로 전달되며, 저장 시 `BUDGET_SOURCE[currentBudgetProj]`를 대상으로 한다(`saveAsCostPlan`, `budget-area-as.js:87`).
- 원가조정(`#/budget-adjust`) → 계정 선택에서 A/S Cost 진입. 계정 선택으로 돌아가는 경로는 별도 버튼 없이 **브라우저 뒤로가기**로 유지된다(`budget-area-as.js:203`).

## 3. 구성 (유형별 행: 인건비/외주인력/외주MA/재료/경비)
A/S비는 5개 유형(`asCostRows`의 키)으로 나뉜다.

| 유형 키 | 화면 표기 | 합계 방식(`sumAsCostRows`) |
|---|---|---|
| `labor` | 인건비 | 행별 `laborAmount + indirectAmount` 합 (`:42`) |
| `outsourcePeople` | 외주비 (예약 인건비) | 행별 `round(unitPrice × mm)` 합 (`:45`) |
| `outsourceMa` | 외주비 (공사/MA) | 행별 `amount` 합 (`:48`) |
| `material` | 재료비 | 행별 `amount` 합 (`:51`) |
| `expense` | 경비 | 행별 `amount` 합 (`:54`) |

요약 카드에서는 외주 두 유형(`outsourcePeople`+`outsourceMa`)을 묶어 "A/S 외주비"로 표시한다(`budget-area-as.js:179`).

## 4. 화면 구성 (편집 테이블)
`renderAsCostPanel(data)`(`budget-area-as.js:116`)이 `.as-cost-panel` 전체를 렌더한다.

1. **요약 카드**(`.as-cost-summary`, `:177`): A/S 인건비 / A/S 외주비(외주인력+외주MA) / A/S 재료비 / A/S 경비 / **A/S비 합계**(`getAsCostTotal`).
2. **안내문**(`.as-cost-guide`, `:184`).
3. **5개 편집 테이블**(공통 렌더러 `renderAsCostTable`, `:98`) — 각 테이블은 제목·"총 N건" 배지·[항목 추가] 버튼·스크롤 영역·합계 행으로 구성:
   - 인건비 컬럼: 번호 / 단위업무 / 직급 / 단가 / 투입공수(M/M) / 인건비금액 / 간접비금액 / 금액(자동) (`:185`)
   - 외주비(예약 인건비) 컬럼: 번호 / 단위업무 / 협력업체 확정여부 / 협력업체 / 직급 / 단가 / 투입공수(M/M) / 금액(자동) (`:186`)
   - 외주비(공사/MA) 컬럼: 번호 / 대분류 / 중분류 / 소분류 / 예상납기일자 / 금액 (`:187`)
   - 재료비 컬럼: 번호 / 대분류 / 중분류 / 소분류 / 예상납기일자 / 금액 (`:188`)
   - 경비 컬럼: 번호 / 계정 / 금액 (`:189`)
4. **[A/S비 계획 저장]** 버튼(`.as-cost-actions`, `:190`).

빈 테이블은 "등록된 데이터가 없습니다." 행을 표시한다(`renderAsCostTable :108`). 각 셀은 `renderAsInput`(`.as-cost-input`, `:94`)로 인라인 편집 인풋을 렌더하며, 금액 컬럼은 `inputmode="numeric"`, M/M은 `inputmode="decimal"`, 예상납기일자는 `type="date"`를 사용한다.

상위 편집기 데코레이터(`renderBudgetAccountEditor`, `:198`)는 A/S Cost 계정일 때 **월별 예산표**(`renderAccountMonthlyBudgetTable`)와 A/S 패널을 함께 `.setup-editor`에 렌더한다. 월별표 데코레이터(`:212`)는 계정명 `CATS[4]`를 화면에서 "A/S비" 라벨로 치환하고 겉박스 스타일을 제거한다.

## 5. 비즈니스 로직 & 규칙 (행 관리·합계·무상하자보증 관계)
### 행 관리
- **추가** `addAsCostRow(kind)`(`:68`): 유형별 템플릿을 push 후 `renderBudgetPage()` 재렌더. 템플릿 기본값 — labor `{role,grade,unitPrice:0,mm:0,laborAmount:0,indirectAmount:0}`, outsourcePeople `{role,contractStatus:'미확정',vendor,grade,unitPrice:0,mm:0}`, outsourceMa/material `{major,middle,minor,expectedDate,amount:0}`, expense `{account,amount:0}`.
- **삭제** `removeAsCostRow(kind, idx)`(`:80`): `splice`로 제거 후 재렌더. 길이 0 이하면 무시.
- **수정** `updateAsCostInput(kind, idx, field, value)`(`:63`): 해당 행/필드 값만 갱신(재렌더 없이 in-place). 존재하지 않는 kind/idx는 무시.

### 합계 계산
- 숫자 파싱은 `asNumber`(`:36`)가 콤마 제거 후 `Number` 변환, 실패 시 0.
- `sumAsCostRows(kind)`(`:40`)가 유형별 합계, `getAsCostTotal()`(`:59`)이 5개 유형 총합.
- 인건비 금액 컬럼과 외주(예약 인건비) 금액 컬럼은 **입력이 아니라 계산 결과**(각각 `laborAmount+indirectAmount`, `round(unitPrice×mm)`)를 표시한다(`:128`, `:134`).

### 저장 규칙
- `saveAsCostPlan()`(`:86`): `ensureAsCostPlanAmount`로 plan 슬롯 보장 → `data.plan[CATS[4]] = getAsCostTotal()`로 총액 반영 → 토스트 "A/S비 계획이 저장되었습니다." → 재렌더. 즉 **A/S비 계획 총액 = 5개 테이블 합계**.

### 무상하자보증 관계
- 소스 코드(`budget-area-as.js`) 내에는 **무상하자보증(보증기간·유무) 여부와 A/S비를 직접 연결하는 조건 분기나 필드가 없다.** A/S비는 무상하자보증 설정과 독립적으로, 사용자가 입력한 유형별 행 합계로만 산출된다. (무상/유상 구분 로직이 별도 파일에 있다면 본 계정 소스와는 연동되어 있지 않음 — 요구사항 검토 필요.)

### 집행계획/상세 데코레이터
- `getExecPlanAccounts`(`:225`): 집행계획 목록에 A/S Cost 행이 없으면 예산(`getBudgetAdjusted`)·사용액(actual+quasi)·잔액·집행월수·집행률을 계산해 행을 추가(`desc:'A/S 프로젝트 인건비, 외주비, 재료비, 경비'`).
- `getAccountDetailRows`(`:237`): A/S Cost 상세 비중을 고정 비율로 반환 — A/S 인건비 .56 / A/S 외주비 .23 / A/S 재료비 .05 / A/S 경비 .16.

## 6. 데이터 모델 (asCostRows 구조)
전역 `asCostRows`(`budget-area-as.js:7`):
```
asCostRows = {
  labor:           [ { role, grade, unitPrice, mm, laborAmount, indirectAmount } ],
  outsourcePeople: [ { role, contractStatus, vendor, grade, unitPrice, mm } ],
  outsourceMa:     [ { major, middle, minor, expectedDate, amount } ],
  material:        [ { major, middle, minor, expectedDate, amount } ],
  expense:         [ { account, amount } ],
}
```
- 시드 데이터: labor 1건(프로젝트 관리/P10, 인건비 24,282,439 + 간접비 3,156,715), outsourcePeople 1건(사업관리/ILS, 미확정, 단가 7,440,000 × 1.5MM), outsourceMa 0건, material 1건(기타/2,304,000), expense 7건(의욕관리비·회의비·잡비·석식대·국내출장비·중앙장비·자가차량지원비 등).
- 계획 총액 저장 위치: `BUDGET_SOURCE[proj].plan[CATS[4]]` (기본 시드 `48,918,351`, `:31`).
- 주의: `asCostRows`는 **단일 전역 객체**로 프로젝트별로 분리되어 있지 않다(모든 프로젝트가 동일 행 데이터를 공유). 목업 한계이며 실제 요구사항에서는 프로젝트별 저장이 필요.

## 7. 프론트엔드 로직 (파일:함수 인용)
모든 로직은 `C:\Workspace\budget\public\js\budget-area-as.js`에 집중.
- 데이터: `asCostRows`(`:7`), `ensureAsCostPlanAmount`(`:29`), 시딩 루프(`:34`).
- 유틸: `asNumber`(`:36`), `renderAsInput`(`:94`).
- 합계: `sumAsCostRows`(`:40`), `getAsCostTotal`(`:59`).
- 행 CRUD: `updateAsCostInput`(`:63`), `addAsCostRow`(`:68`), `removeAsCostRow`(`:80`).
- 저장: `saveAsCostPlan`(`:86`).
- 렌더: `renderAsCostTable`(`:98`), `renderAsCostPanel`(`:116`).
- 데코레이터(체인 위임 패턴, budget-status-*.js 로드 이후여야 함 — `:4`): `renderBudgetAccountEditor`(`:198`), `renderAccountMonthlyBudgetTable`(`:212`), `getExecPlanAccounts`(`:225`), `getAccountDetailRows`(`:237`).

## 8. 사용자 플로우
1. 원가조정(`#/budget-adjust`)에서 A/S Cost 계정 선택 → `#/budget-adjust/as` 진입.
2. 편집기에 월별 예산표 + A/S비 패널(요약 카드 + 5개 테이블)이 표시됨.
3. 각 테이블에서 [항목 추가]로 행 생성 → 셀 인라인 입력(`updateAsCostInput`)으로 값 수정 → 필요 시 [삭제].
4. 입력에 따라 요약 카드/합계 행이 재렌더 시 갱신(추가·삭제 즉시 재렌더, 셀 수정은 in-place).
5. [A/S비 계획 저장] 클릭 → 총액이 `plan[CATS[4]]`에 반영 → 토스트 확인.
6. 계정 선택으로 복귀는 브라우저 뒤로가기.

## 9. 관련 소스 파일
- `C:\Workspace\budget\public\js\budget-area-as.js` — A/S Cost 전용 데이터/렌더/데코레이터(주 소스).
- `C:\Workspace\budget\public\js\budget-status.js` — `CATS` 계정 배열 정의(`:742`), 공통 렌더 파이프라인.
- `C:\Workspace\budget\public\js\budget-status-3.js` / `budget-status-4.js` — 데코레이터가 위임/오버라이드하는 원본 함수(`renderBudgetAccountEditor`, `renderAccountMonthlyBudgetTable`, `getExecPlanAccounts`, `getAccountDetailRows`).
- `C:\Workspace\budget\public\js\budget-area-routes.js` — `#/budget-adjust/as` 라우트(`:7`).
- 의존 전역/유틸: `fmt`(금액 포맷), `showToast`, `renderBudgetPage`, `BUDGET_SOURCE`, `currentBudgetProj`, `getBudgetAdjusted`.

## 10. 요구사항 후보 (bullet)
- A/S비 계정은 인건비/외주(예약 인력)/외주(공사·MA)/재료/경비 5개 유형별 행을 각각 추가·수정·삭제할 수 있어야 한다.
- 인건비 유형의 금액은 `인건비금액 + 간접비금액`, 외주(예약 인력) 금액은 `단가 × 투입공수(M/M)` 반올림으로 자동 계산·표시되어야 한다.
- 각 유형 테이블은 건수 배지와 유형별 합계 행을 표시하고, 상단 요약 카드는 인건비/외주비(예약+공사MA 합산)/재료비/경비/총합계를 실시간 표시해야 한다.
- [A/S비 계획 저장] 시 5개 유형 총합을 프로젝트 계획 총액(`plan[CATS[4]]`)에 반영하고 저장 피드백을 제공해야 한다.
- 금액 입력은 콤마 포함 문자열을 허용하되 숫자로 정규화해 합산해야 한다(`asNumber`).
- 외주/재료 유형은 대·중·소분류와 예상납기일자를, 외주(예약 인력) 유형은 협력업체 확정여부·협력업체·직급을 관리해야 한다.
- 집행계획 목록과 계정 상세(비중)에 A/S Cost가 자동 편입되어야 한다.
- (검토 필요) 무상하자보증 유무/보증기간과 A/S비 산정의 연동 여부 — 현재 목업은 미연동. 실제 요건에서 무상 구간 원가 처리 규칙 정의 필요.
- (개선) `asCostRows`가 전역 단일 객체로 프로젝트별 분리 저장이 안 됨 — 프로젝트별 A/S 원가 데이터 영속화 필요.

작성 완료: C:\Workspace\budget\docs\수행원가\계정\AS비.md
