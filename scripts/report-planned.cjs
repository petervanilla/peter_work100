/**
 * 「준비 중」 도구 분석 · 완성 리포트 생성
 * 실행: node scripts/report-planned.cjs
 * 출력: docs/planned-tools-completion-report.md
 *
 * 분석 로직은 scripts/analyze-planned.cjs 를 공유하므로 숫자는 항상 실데이터와 일치합니다.
 */
const fs = require("node:fs");
const path = require("node:path");

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const { loadTs, root } = require("./lib/load-ts.cjs");
const result = require("./analyze-planned.cjs");

const T = loadTs("src/lib/tools/index.ts");
const OUT = path.join(root, "docs/planned-tools-completion-report.md");

const { ready, planned, total } = result.counts;
const wave1Rows = result.wave1;
const wave1 = wave1Rows.length;
const wave1A = wave1Rows.filter((r) => r.path.startsWith("A")).length;
const wave1B = wave1Rows.filter((r) => r.path.startsWith("B")).length;
const pathA = result.byPath["A 재사용"] || 0;
const pathB = result.byPath["B 이식"] || 0;
const pathC = result.byPath["C 신규 설계"] || 0;

/* 분류별 완성률 오름차순(날악한 분류부터) */
const catRows = Object.entries(result.byCat)
  .map(([name, v]) => ({ name, ...v, total: v.ready + v.planned }))
  .sort((a, b) => a.ready / a.total - b.ready / b.total);

/* 얇은 템플릿 가족: 완성 템플릿이 적은 모양에 몰린 준비 중 도구 */
const thinShapes = result.shapeInfo.filter((s) => s.planned > 0 && s.ready <= 4);
const thinPlannedCount = thinShapes.reduce((n, s) => n + s.planned, 0);

/* 배치 구성 */
const wave1ByCat = {};
for (const r of wave1Rows) (wave1ByCat[r.category] = wave1ByCat[r.category] || []).push(r.title);
const batch1 = Object.entries(wave1ByCat).sort((a, b) => b[1].length - a[1].length);

/* wave1을 분류별 A/B 개수와 완성률로 재정렬 (A 많은 순 → 완성률 낮은 순) */
const rateOf = (name) => { const v = result.byCat[name]; return pct(v.ready, v.ready + v.planned); };
const batch1Wave = Object.entries(wave1ByCat)
  .map(([cat, list]) => {
    const rows = wave1Rows.filter((r) => r.category === cat);
    return {
      cat, n: list.length,
      a: rows.filter((r) => r.path.startsWith("A")).length,
      b: rows.filter((r) => r.path.startsWith("B")).length,
      rate: rateOf(cat),
    };
  })
  .sort((x, y) => y.a - x.a || x.rate - y.rate);
const wave1ByCategoryA = batch1Wave.filter((r) => r.a > 0);
const wave1ByCategoryB = batch1Wave.filter((r) => r.b > 0);
const batch2 = result.rows.filter((r) => r.wave !== 1 && r.path.startsWith("A"));
const batch3 = result.rows.filter((r) => r.wave !== 1 && r.path.startsWith("B"));


const md = `# 「준비 중 ${planned}개」 분석 · 완성 리포트

> \`node scripts/report-planned.cjs\` 로 만든 문서입니다. 수치는 생성 시점 실데이터에서 나오고,
> \`node scripts/analyze-planned.cjs\` 로 언제든 다시 확인할 수 있어요.
> 현재 상태: **완성 ${ready}개 / 준비 중 ${planned}개 / 목표 ${total}개** (완성 = \`public/tools/*.html\` 개수와 1:1)

---

## 0. 한 줄 결론

**${planned}개는 미완성이 아니라 «제목·분류만 정해진 후보 목록»이고, 신규 설계가 필요한 도구는 ${pathC}개입니다.**
완성 ${ready}개를 베이스로 베끼거나 옮겨서 전부 만들 수 있고(${pathA}개는 같은 분류 안에서, ${pathB}개는 다른 분류에서 가져오면 됨),
그중 ${wave1}개는 이미 「다음 제작(wave 1)」 순번까지 정해져 있습니다.
남은 과제는 정의가 없는 것이 아니라 **무엇을 먼저 만들지 정하는 것**입니다.

---

## 1. 「준비 중 ${planned}개」란 정확히 무엇인가

**저장 위치**: \`src/lib/tools/planned.ts\` 의 \`PLANNED_TOOLS\` 배열 (${planned}행)

**가지고 있는 것 (한 행에 4~5개 항목뿐)**

| 항목 | 예 |
|---|---|
| 제목 | 마감·퇴근 체크리스트 |
| 분류 | 알바·무인매장 |
| 대상(누가) | 알바·직원, 사장님(가게) |
| 모양(도구 형태) | 보드·목록 |
| wave | 1이면 «다음 제작» |

**없는 것 (완성에 필요한 4가지)**

1. **HTML** — 실제 동작하는 화면 (\`public/tools/<slug>.html\`)
2. **썸네일** — 카탈로그 카드용 878×560 PNG (\`public/tools/previews/<slug>.png\`)
3. **상세 페이지 명세** — 요약, 이럴 때 좋아요, 우리 팀 방식으로 바꿔 보기, 내 상황 질문, 기본 포함, 후보 기능, 전문가 역할
4. **AI 주문서** — 3번에서 자동 생성되므로 별도 작성 안 함

**화면에서의 모습**

- 분류별 카드 섹션 아래 **«곧 나올 도구» 묶음의 점선 카드**(\`PlannedCard\`)로만 표시됩니다.
- **클릭해도 이동하지 않습니다** (링크가 없는 일반 div) — 아무 화면도 열리지 않아요.
- ${wave1}개(wave 1)에만 앰버색 **«다음 제작»** 태가 붙습니다.
- 필터(분류·대상·모양)와 검색에는 준비 중 목록도 함께 걸립니다.

**카운트 규칙**

- 완성 도구 1개를 추가하면 준비 중은 자동으로 1개 줄고 목표 ${total}은 그대로입니다.
- \`verify-catalog.cjs\` 가 \`전체 = 완성 + 준비 중 = ${total}\`, \`완성 = HTML 개수\`를 매번 확인합니다.

---

## 2. 왜 아직 완성되지 않았나 — 원인 3가지

### 원인 1. 계획된 지연 (의도된 설계)

${total}개를 한 번에 안 채우고, **완성되는 만큼을 미리 공개하는 구조**를 택했습니다.
카탈로그가 「지금 바로 쓸 수 있는 것」과 «곧 나올 것»을 정직하게 구분해 두고 있는 상태예요.
게으름이 아니라 순번(wave)만 먼저 잡아 둔 상태입니다.

### 원인 2. 완성 속도가 분류 확장 속도를 못 따라감

분류별 완성률이 크게 엇갈립니다.

| 분류 | 완성 | 준비 중 | 완성률 | 그중 다음 제작 |
|---|---:|---:|---:|---:|
${catRows.map((r) => `| ${r.name} | ${r.ready} | ${r.planned} | **${pct(r.ready, r.total)}%** | ${r.wave1} |`).join("\n")}

- 12개 분류 가운데 **${catRows.filter((r) => pct(r.ready, r.total) <= 33).length}개**의 완성률이 33% 이하입니다.
  특히 **${catRows[0].name} ${pct(catRows[0].ready, catRows[0].total)}%, ${catRows[1].name} ${pct(catRows[1].ready, catRows[1].total)}%, ${catRows[2].name} ${pct(catRows[2].ready, catRows[2].total)}%** 순으로 낮아,
  카탈로그를 들어오면 해당 분류는 «곧 나올 도구»만 우두머리로 보입니다.
- 반면 **${catRows[catRows.length - 1].name}은 ${pct(catRows[catRows.length - 1].ready, catRows[catRows.length - 1].total)}%**라 거의 완결됐어요.

### 원인 3. 모양 템플릿 편중 — 진짜 병목

같은 모양(도구 형태)끼리는 화면을 거의 그대로 베낄 수 있어서, **템플릿 두께가 제작 속도를 결정합니다.**

| 모양 | 완성 템플릿 | 준비 중 | 평가 |
|---|---:|---:|---|
${result.shapeInfo.map((s) => `| ${s.shape} | ${s.ready} | ${s.planned} | ${s.ready >= 8 ? "두꺼움 — 베끼기 쉬움" : s.ready >= 4 ? "보통" : "얇음 — 완성본 " + s.ready + "개뿐"} |`).join("\n")}

- **표 32개 · 보드·목록 13개**가 준비 중의 절반 이상이라 대부분이 유리한 위치입니다.
- 반대로 **${thinShapes.map((s) => `${s.shape}(${s.ready}개)`).join(" · ")}** 모양의 준비 도구가 ${thinPlannedCount}개 있는데,
  이들은 베낄 완성본이 적어 시작부터 느립니다. **첫 도구를 만들기 전에 해당 계열 템플릿을 1~2개 미리 만들어 두면 이후 작업이 이어집니다.**

---

## 3. 완성 가능성 분석 — 경로 A / B / C

| 경로 | 뜻 | 개수 | 한 도구당 작업 방식 |
|---|---|---:|---|
| **A 재사용** | 같은 분류 안에 같은 모양의 완성 도구가 있음 | **${pathA}** | 해당 완성 도구의 HTML을 복사한 뒤 표·계산식·문구를 새 도구 내용으로 바꿈 |
| **B 이식** | 같은 모양 완성 도구가 다른 분류에 있음 | **${pathB}** | 화면 골격·로직은 그대로 두고 분류용 요소(헤더 문구, 인쇄 레이아웃, 계산 항목)만 추가·조정 |
| **C 신규 설계** | 그 모양의 완성본이 하나도 없음 | **${pathC}** | 해당 없음 — 8개 모양 모두에 최소 1개 완성본이 존재 |

**요약: ${planned}개 전부가 기존 자산으로 완성 가능한 구조입니다.** 신규 설계는 0건입니다.

- A ${pathA}개 · B ${pathB}개 · C ${pathC}개
- 다음 제작(wave 1) ${wave1}개 안에서도 A ${wave1A}개 / B ${wave1B}개로 나뉩니다.

---

## 4. 도구별 베이스 매핑 ${planned}건

같은 모양 + 같은 분류를 우선으로 자동 매칭한 결과입니다. **시작점일 뿐, 실제 제작 중 더 가까운 완성본이 보이면 그걸 바꿔 쓰세요.**
(모양이 같아도 기능이 전혀 다른 경우가 있어 착당한 후보도 섞여 있어요 — 예: \`수료증·상장 일괄 만들기\`의 자동 매칭 베이스가 \`업무 시간 기록기\`입니다.)

| # | 분류 | 제목 | 모양 | 경로 | 베이스(완성 도구) |
|---:|---|---|---|---|---|
${result.rows.map((r, i) => `| ${i + 1} | ${r.category} | ${r.title} | ${r.shape} | ${r.path} | ${r.base} |`).join("\n")}

---

## 5. 완성 기준 (Definition of Done)

완성으로 분류되기 위해 \`node scripts/verify-catalog.cjs\` 가 **전체 1,500개 이상의 항목**을 자동으로 검사합니다.

### 5-1. 명세 조건 (Tool 메타데이터)

- \`status: "ready"\`, kebab-case slug, 제목·slug 중복 없음
- \`summary\` 30자 이상
- \`useCases\` 3개 이상 (누가·언제·어떻게 각각 채움)
- \`changeTips\` 3개 이상
- \`situations\` 3개 이상, 각 선택지 2개 이상
- \`basics\` 3개 이상, \`candidates\` 그룹 3개 이상(그룹당 항목 2개 이상)
- \`expert\`(전문가 역할), \`height\`(400~1000, 선택)
- AI 주문서 자동 생성 검사: 제목·1·2단계·모든 질문 라벨 포함

### 5-2. 파일 조건

- \`public/tools/<slug>.html\` 존재 · HTML 안에 다른 파일 참조 없음(외부 라이브러리·외부 이미지 금지)
- \`public/tools/previews/<slug>.png\` = **878×560 PNG**
- HTML이 있는데 메타데이터가 없으면 실패, 메타가 있는데 파일이 없으면 실패

### 5-3. 동작 조건 (브라우저 테스트)

- 카탈로그·상세·필터·작업경로·라이트/다크·모바일 섹션 통과
- \`smoke-tools.cjs\` — 새로 추가한 도구의 계산·저장·추가·삭제 동작

---

## 6. 도구 하나를 완성하는 7스텝

| # | 할 일 | 파일 |
|---:|---|---|
| 1 | 준비 중 목록에서 해당 행 삭제. wave 1이었다면 **가장 가까운 다음 행에 \`wave: 1\`을 옮겨** 순번을 유지 | \`src/lib/tools/planned.ts\` |
| 2 | 완성 도구 메타데이터 추가 (5-1 조건 충족) | \`src/lib/tools/ready/<분류>.ts\` |
| 3 | 베이스 HTML 복사 후 새 도구 내용으로 교체 (단일 파일·localStorage·다크모드·복사/인쇄 유지) | \`public/tools/<slug>.html\` |
| 4 | 썸네일 생성 (HTML 목록을 자동으로 읽으므로 목록 수정 불필요) | \`npx --yes --package=playwright -c 'node scripts/capture-previews.cjs'\` |
| 5 | 데이터·파일·명세 정합성 검사 | \`node scripts/verify-catalog.cjs\` |
| 6 | 사이트 섹션 + 신규 도구 동작 검사 | \`SITE_URL=... npx --yes --package=playwright -c 'node scripts/test-site.cjs'\` |
| 7 | 빌드, 그리고 테스트가 올린 복사 횟수 초기화 | \`npm run build\` / \`truncate table tool_copy_counts;\` |

완성은 **3, 2, 4** 순서로도 진행 가능합니다(HTML을 먼저 만들면 명세는 화면을 보며 채우기 쉽습니다).

---

## 7. 추천 배치 계획

### 배치 1 — 다음 제작(wave 1) ${wave1}개

\`planned.ts\` 에 \`wave: 1\`이 붙은 ${wave1}개를 그대로 가져가면 됩니다. 분류별로:

| 분류 | 개수 | 도구 |
|---|---:|---|
${batch1.map(([cat, list]) => `| ${cat} | ${list.length} | ${list.join(", ")} |`).join("\n")}

**추천 순서 (같은 분류에서 바로 베끼는 A 경로 먼저)**

| 순서 | 분류 | 도구 수 | 경로 구성 | 분류 완성률 |
|---:|---|---:|---|---:|
${batch1Wave.map((r, i) => `| ${i + 1} | ${r.cat} | ${r.n} | A ${r.a}개 · B ${r.b}개 | ${r.rate}% |`).join("\n")}

**1단계 — A 재사용 ${wave1A}개를 먼저 끝냅니다.** 같은 분류 안의 완성 도구 HTML을 복사해 내용만 바꾸면 되므로 가장 빠릅니다.
(${wave1ByCategoryA.map((x) => `${x.cat} ${x.a}개`).join(", ")})

**2단계 — B 이식 ${wave1B}개를 이어서 합니다.** 베이스가 다른 분류라 화면 요소를 다시 짜야 해 속도가 느립니다.
(${wave1ByCategoryB.map((x) => `${x.cat} ${x.b}개`).join(", ")})

그중 **${catRows[0].name}(${catRows[0].ready}/${catRows[0].total}, ${pct(catRows[0].ready, catRows[0].total)}%)**은 12개 분류 중 완성률이 가장 낮아,
6개가 완성되면 카탈로그 인상이 가장 크게 바뀝니다.

### 배치 2 — A 경로 남은 도구 ${batch2.length}개

같은 분류 안에서 베끼면 되므로 **배치당 5~6개씩 병렬 진행 가능**합니다.

### 배치 3 — B 이식 남은 도구 ${batch3.length}개

분류가 달라 화면 요소를 다시 짜야 해 **1회차에 3~4개씩**이 현실적입니다.

### 배치 4 — 얇은 템플릿 보강 (과제)

${thinShapes.map((s) => `\`${s.shape}\`(완성 ${s.ready}개, 준비 ${s.planned}개)`).join(", ")} 계열을 먼저 통과시키면 후속 도구가 따라옵니다.

> **순번 규칙**: 한 배치가 끝나면 \`planned.ts\` 의 다음 묶음에 \`wave: 1\`을 붙이고, 완성 도구는 \`ready/\` 로 옮깁니다.
> 이 규칙은 \`verify-catalog.cjs\` 가 자동으로 검사합니다(«다음 제작 대상이 완성된 도구와 겹치면 실패»).

---

## 8. 리스크 · 재검토 사항

1. **기능 중복 의심** — 제목이 완성 도구와 60% 이상 겹치는 후보:
${result.nearHits.length ? result.nearHits.map((r) => `   - \`${r.title}\` ↔ \`${r.near}\``).join("\n") : "   - 없음"}
   → 제작 전에 통합할지 분리할지 결정해야 합니다. (완성 후에는 제목 중복 검사도 걸립니다.)
2. **약한 템플릿 계열 ${thinPlannedCount}개** — 섹션 5의 얇은 모양에 몰린 도구들은 베이스 신뢰도가 낮습니다.
3. **자동 베이스 매핑의 한계** — 같은 모양 ≠ 같은 기능. 섹션 4 표는 출발점이며, 착당한 조합은 직접 베이스를 고를 때 \`analyze-planned.cjs\`의 경로(A/B/C)만 유지하면 검증에 문제가 없습니다.
4. **드문 렌더링 조건**: \`사진 기록\` 계열은 브라우저 저장 용량 한계가 있어 썸네일·캡처 시 실제 이미지 포함 캡처 시간이 길 수 있습니다.

---

## 9. 지금 바로 확인할 수 있는 명령

\`\`\`bash
# 준비 중 ${planned}개의 경로·베이스 매핑 (콘솔)
node scripts/analyze-planned.cjs

# 리포트 재생성 (이 문서 갱신)
node scripts/report-planned.cjs

# 완성 기준 정합성 검사 (서버 불필요)
node scripts/verify-catalog.cjs

# 브라우저 섹션 테스트 (서버 띄운 뒤)
SITE_URL=http://127.0.0.1:3000 npx --yes --package=playwright -c 'node scripts/test-site.cjs'
\`\`\`

---

## 10. 결론 — 완성까지 남은 거리

| 항목 | 수치 |
|---|---:|
| 남은 도구 | ${planned}개 |
| 신규 설계가 필요한 도구 | ${pathC}개 |
| 같은 분류 베이스로 바로 가능한(A) | ${pathA}개 |
| 다른 분류에서 옮겨야 하는(B) | ${pathB}개 |
| 이미 순번이 잡힌 다음 제작(wave 1) | ${wave1}개 |
| 목표까지 | ${total - ready}개 |

**${planned}개는 «아직 안 만든 것»이 아니라 «만드는 순서가 정해진 대기열»입니다.**
${pathC}개의 미지의 설계가 남아 있지 않으므로, 배치 1부터 시작하면 도구 하나가 끝날 때마다 카탈로그 숫자(${ready}/${total})가 그대로 올라갑니다.
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md, "utf8");
console.log(`✅ 리포트 생성: ${path.relative(root, OUT)} (${md.split("\n").length}줄, ${(Buffer.byteLength(md) / 1024).toFixed(1)}KB)`);
console.log(`   요약 — 완성 ${ready} / 준비 중 ${planned} / 경로 A ${pathA} · B ${pathB} · C ${pathC} / wave1 ${wave1}`);
