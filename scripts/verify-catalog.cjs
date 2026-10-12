/*
 * 카탈로그 데이터·정적 파일 정합성 검증 (서버 불필요)
 * 실행: node scripts/verify-catalog.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadTs, root } = require("./lib/load-ts.cjs");

const T = loadTs("src/lib/tools/index.ts");
const C = loadTs("src/lib/catalog.ts");

let checks = 0;
let failures = 0;
function check(name, ok, detail = "") {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function section(title, fn) {
  const before = { checks, failures };
  console.log(`\n■ ${title}`);
  fn();
  const n = checks - before.checks;
  const f = failures - before.failures;
  console.log(f === 0 ? `  ✓ ${n}개 항목 통과` : `  → ${n}개 중 ${f}개 실패`);
}

const norm = (s) => s.replace(/[\s·()\-→:]/g, "").toLowerCase();
const toolsDir = path.join(root, "public/tools");
const previewDir = path.join(toolsDir, "previews");
const htmlSlugs = fs.readdirSync(toolsDir).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5));
const pngSlugs = fs.readdirSync(previewDir).filter((f) => f.endsWith(".png")).map((f) => f.slice(0, -4));
const readySlugs = T.TOOLS.map((t) => t.slug);

section("카탈로그 수 (업무효율 100)", () => {
  const c = T.catalogCounts();
  check("전체 = 완성 + 준비 중", c.total === c.ready + c.planned);
  check(`전체가 목표 ${T.CATALOG_GOAL}개와 같다`, c.total === T.CATALOG_GOAL, `현재 ${c.total}`);
  check("완성 도구 수 = public/tools/*.html 수", c.ready === htmlSlugs.length, `${c.ready} vs ${htmlSlugs.length}`);
  check("준비 중 = 목표 − 완성", c.planned === T.CATALOG_GOAL - c.ready);
  const wave1 = T.PLANNED_TOOLS.filter((t) => t.wave === 1);
  check("다음 제작(wave 1) 대상이 있다", wave1.length > 0, `${wave1.length}개`);
  const readyTitles = new Set(T.TOOLS.map((t) => t.title));
  check("다음 제작 대상 중 이미 완성된 도구가 없다", wave1.every((t) => !readyTitles.has(t.title)));
  check("준비 중 목록에 완성된 도구가 남아 있지 않다", T.PLANNED_TOOLS.every((t) => !readyTitles.has(t.title)));
  console.log(`  · 다음 제작 ${wave1.length}개`);
  console.log(`  · 완성 ${c.ready} / 준비 중 ${c.planned} / 전체 ${c.total}`);
});

section("이름·slug 중복", () => {
  check("slug 중복 없음", new Set(readySlugs).size === readySlugs.length);
  check("slug 형식(kebab-case)", readySlugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)));
  const titles = [...T.TOOLS.map((t) => t.title), ...T.PLANNED_TOOLS.map((t) => t.title)];
  const seen = new Map();
  for (const t of titles) {
    const k = norm(t);
    check(`제목 중복 없음: ${t}`, !seen.has(k), seen.has(k) ? `'${seen.get(k)}'와 같음` : "");
    seen.set(k, t);
  }
  check("featured 번호 중복 없음", (() => {
    const f = T.TOOLS.map((t) => t.featured).filter(Boolean);
    return new Set(f).size === f.length;
  })());
  check("addedAt 중복 없음", (() => {
    const a = T.TOOLS.map((t) => t.addedAt).filter((v) => v !== undefined);
    return new Set(a).size === a.length;
  })());
});

section("분류·대상·모양(필터 칩) 정합성", () => {
  const catIds = T.CATEGORIES.map((c) => c.id);
  check("카테고리 id 중복 없음", new Set(catIds).size === catIds.length);
  const all = [...T.TOOLS, ...T.PLANNED_TOOLS];
  for (const t of all) {
    check(`카테고리 존재: ${t.title}`, catIds.includes(t.category), t.category);
    check(`대상(who) 유효: ${t.title}`, t.who.length > 0 && t.who.every((w) => T.ROLES.includes(w)), t.who.join(","));
    check(`모양(shape) 유효: ${t.title}`, t.shape.length > 0 && t.shape.every((s) => T.SHAPES.includes(s)), t.shape.join(","));
  }
  for (const id of catIds) check(`빈 섹션 없음: ${id}`, all.some((t) => t.category === id));
  for (const r of T.ROLES) check(`결과 0개인 '누가 쓰나' 칩 없음: ${r}`, all.some((t) => t.who.includes(r)));
  for (const s of T.SHAPES) check(`결과 0개인 '도구 모양' 칩 없음: ${s}`, all.some((t) => t.shape.includes(s)));
  const sum = catIds.reduce((n, id) => n + all.filter((t) => t.category === id).length, 0);
  check("섹션 합계 = 전체", sum === all.length);
  for (const id of catIds) {
    const n = all.filter((t) => t.category === id).length;
    console.log(`  · ${id.padEnd(8, "　")} ${String(n).padStart(2)}개 (완성 ${T.TOOLS.filter((t) => t.category === id).length})`);
  }
});

section("완성 도구 명세 · AI 주문서", () => {
  const bad = (s) => /\uFFFD|\u0000|undefined|\[object/.test(s);
  for (const t of T.TOOLS) {
    const tag = `[${t.slug}]`;
    check(`${tag} status=ready`, t.status === "ready");
    check(`${tag} 요약 30자 이상`, t.summary.length >= 30);
    check(`${tag} 이럴 때 좋아요 3개`, t.useCases.length >= 3 && t.useCases.every((u) => u.who && u.when && u.how));
    check(`${tag} 바꿔 보기 3개 이상`, t.changeTips.length >= 3);
    check(`${tag} 내 상황 질문 3개 이상, 선택지 2개 이상`, t.situations.length >= 3 && t.situations.every((s) => s.options.length >= 2 && s.label && s.question));
    check(`${tag} 기본 포함 3개 이상`, t.basics.length >= 3);
    check(`${tag} 후보 그룹 3개 이상`, t.candidates.length >= 3 && t.candidates.every((g) => g.group && g.items.length >= 2));
    check(`${tag} 전문가 역할`, Boolean(t.expert));
    check(`${tag} 미리보기 높이`, t.height === undefined || (t.height >= 400 && t.height <= 1000));
    const prompt = T.buildPrompt(t);
    check(`${tag} 주문서에 도구 이름`, prompt.startsWith(`[업무 도구 주문서] ${t.title}`));
    check(`${tag} 주문서 1·2단계`, prompt.includes("1단계") && prompt.includes("2단계"));
    check(`${tag} 주문서에 모든 질문 라벨`, t.situations.every((s) => prompt.includes(`[${s.label}]`)));
    check(`${tag} 주문서에 ★ 후보`, !t.candidates.some((g) => g.items.some((i) => i.star)) || prompt.includes("★"));
    check(`${tag} 깨진 문자·undefined 없음`, !bad(prompt) && !bad(JSON.stringify(t)));
  }
});

section("완성 도구 파일 (HTML · 썸네일)", () => {
  check("메타데이터 없는 HTML 없음", htmlSlugs.every((s) => readySlugs.includes(s)), htmlSlugs.filter((s) => !readySlugs.includes(s)).join(","));
  check("메타데이터 없는 썸네일 없음", pngSlugs.every((s) => readySlugs.includes(s)), pngSlugs.filter((s) => !readySlugs.includes(s)).join(","));
  for (const slug of readySlugs) {
    const tag = `[${slug}]`;
    const htmlPath = path.join(toolsDir, `${slug}.html`);
    check(`${tag} HTML 파일`, fs.existsSync(htmlPath));
    const pngPath = path.join(previewDir, `${slug}.png`);
    if (fs.existsSync(pngPath)) {
      const b = fs.readFileSync(pngPath);
      const isPng = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      check(`${tag} 썸네일 878×560 PNG`, isPng && b.readUInt32BE(16) === 878 && b.readUInt32BE(20) === 560);
    } else check(`${tag} 썸네일 파일`, false);
    if (!fs.existsSync(htmlPath)) continue;
    const html = fs.readFileSync(htmlPath, "utf8");
    check(`${tag} doctype·lang=ko·viewport`, /^<!doctype html>/i.test(html) && /<html lang="ko"/.test(html) && /name="viewport"/.test(html));
    check(`${tag} <title>`, /<title>[^<]+<\/title>/.test(html));
    check(`${tag} '이럴 때 좋아요' 섹션`, html.includes("이럴 때 좋아요"));
    check(`${tag} 외부 리소스 없음(오프라인 동작)`, !/(src|href|action)\s*=\s*["']https?:/i.test(html) && !/url\(\s*["']?https?:/i.test(html) && !/@import/.test(html));
    check(`${tag} 브라우저 저장(localStorage)`, html.includes("localStorage"));
    check(`${tag} NUL·깨진 문자 없음`, !/\uFFFD|\u0000/.test(html));
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    check(`${tag} 인라인 스크립트 존재`, scripts.length >= 1);
    for (const code of scripts) {
      try {
        new vm.Script(code);
        check(`${tag} 스크립트 문법`, true);
      } catch (e) {
        check(`${tag} 스크립트 문법`, false, e.message);
      }
    }
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const refs = [...html.matchAll(/getElementById\("([^"]+)"\)/g), ...html.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);
    const missing = [...new Set(refs)].filter((r) => !ids.has(r));
    check(`${tag} 참조하는 id가 모두 존재`, missing.length === 0, missing.join(","));
    const dupIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) !== i);
    check(`${tag} id 중복 없음`, dupIds.length === 0, [...new Set(dupIds)].join(","));
  }
});

section("NEW 표시 규칙 (최근 추가 2개)", () => {
  const expected = [...T.TOOLS].filter((t) => t.addedAt !== undefined).sort((a, b) => b.addedAt - a.addedAt).slice(0, 2).map((t) => t.slug);
  const actual = [...T.newToolSlugs()];
  check("NEW 대상이 정확히 2개", actual.length === 2);
  check("addedAt이 가장 큰 2개", expected.every((s) => actual.includes(s)), `${actual.join(",")}`);
  console.log(`  · NEW = ${actual.join(", ")}`);
});

section("검색·필터 로직", () => {
  const run = (q) => C.filterCatalog(C.parseQuery(q));
  const all = run({});
  check("조건 없음 → 전체", all.ready.length + all.planned.length === T.CATALOG_GOAL);
  const byCat = T.CATEGORIES.reduce((n, c) => { const r = run({ cat: c.id }); return n + r.ready.length + r.planned.length; }, 0);
  check("분야별 결과 합 = 전체", byCat === T.CATALOG_GOAL, `${byCat}`);
  const hosp = run({ cat: "병원·의료" });
  const hospReady = T.TOOLS.filter((t) => t.category === "병원·의료").length;
  const hospPlanned = T.PLANNED_TOOLS.filter((t) => t.category === "병원·의료").length;
  check("병원·의료 분야 필터가 데이터와 일치", hosp.ready.length === hospReady && hosp.planned.length === hospPlanned, `${hosp.ready.length}/${hosp.planned.length}`);
  check("학생 대상에 학점·가중평균 계산기", run({ role: "학생" }).planned.some((t) => t.title === "학점·가중평균 계산기"));
  check("검색 '회의' → 회의 타이머 포함", run({ q: "회의" }).ready.some((t) => t.slug === "meeting-timer"));
  check("검색은 대소문자 무시('okr')", run({ q: "okr" }).ready.some((t) => t.slug === "okr-builder") && run({ q: "OKR" }).ready.length === run({ q: "okr" }).ready.length);
  check("없는 검색어 → 0개", (() => { const r = run({ q: "zzzzzzzz" }); return r.ready.length + r.planned.length === 0; })());
  check("잘못된 분야 값은 무시", C.parseQuery({ cat: "없는분야" }).cat === "" && run({ cat: "없는분야" }).ready.length === T.TOOLS.length);
  check("배열 쿼리도 첫 값 사용", C.parseQuery({ q: ["회의", "보고"] }).q === "회의");
  check("검색어 60자 제한", C.parseQuery({ q: "가".repeat(200) }).q.length === 60);
  const q = C.parseQuery({ cat: "알바·무인매장", role: "알바·직원", shape: "사진 기록", q: "사진" });
  const url = new URL("http://x" + C.hrefFor(q, {}));
  check("링크 왕복(parse ↔ href)", JSON.stringify(C.parseQuery(Object.fromEntries(url.searchParams))) === JSON.stringify(q));
  check("칩 해제 링크는 파라미터 제거", !C.hrefFor(q, { cat: "" }).includes("cat="));
  check("필터 없으면 /tools", C.hrefFor(C.parseQuery({}), {}) === "/tools");
});

section("소스 파일 상태 (NUL · 깨진 문자)", () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" || e.name === ".next" ? [] : walk(p);
    return /\.(ts|tsx|cjs|css)$/.test(e.name) ? [p] : [];
  });
  for (const f of [...walk(path.join(root, "src")), ...walk(path.join(root, "scripts"))]) {
    const text = fs.readFileSync(f, "utf8");
    check(`${path.relative(root, f)}`, !/\u0000|\uFFFD/.test(text));
  }
});

section("다크 모드 클래스 짝 (정적 검사)", () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
  // 라이트 모드에서 '밝은 면·어두운 글자'를 만드는 클래스 → 같은 문자열 안에 dark: 짝이 있어야 함
  const RULES = [
    ["흰 바탕", (t) => t === "bg-white" || /^bg-white\/([4-9]\d)$/.test(t), /^dark:bg-/],
    ["연한 회색 바탕", (t) => /^bg-slate-(50|100|200)(\/\d+)?$/.test(t), /^dark:bg-/],
    ["연한 강조 바탕", (t) => /^bg-(indigo|violet|emerald|amber|rose|sky)-(50|100)(\/\d+)?$/.test(t), /^dark:bg-/],
    ["어두운 회색 글자", (t) => /^text-slate-(500|600|700|800|900)$/.test(t), /^dark:text-/],
    ["진한 강조 글자", (t) => /^text-(indigo|violet|emerald|amber|rose)-(500|600|700|800|900)$/.test(t), /^dark:text-/],
    ["연한 테두리", (t) => /^border-slate-(100|200|300)(\/\d+)?$/.test(t), /^dark:border-/],
    ["연한 링", (t) => /^ring-slate-(100|200)$/.test(t), /^dark:ring-/],
    ["밝은 hover 바탕", (t) => /^hover:bg-(white|slate-50|slate-100)$/.test(t), /^dark:hover:bg-/],
    ["밝은 그라데이션", (t) => /^(from|via|to)-(white|slate-50)$/.test(t), /^dark:(from|via|to)-/],
  ];
  const classLike = (tokens) =>
    tokens.length >= 2 && tokens.some((t) => /^(?:[a-z-]+:)*(bg|text|border|flex|grid|rounded|px|py|p|m|mt|gap|h|w|ring|from|to)-/.test(t));
  let literals = 0;
  for (const file of walk(path.join(root, "src"))) {
    const src = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    for (const m of src.matchAll(/"([^"\n]*)"|`([^`]*)`/g)) {
      const raw = (m[1] ?? m[2] ?? "").replace(/\$\{[^}]*\}/g, " ");
      const tokens = raw.split(/\s+/).filter(Boolean);
      if (!classLike(tokens)) continue;
      literals++;
      for (const [name, test, need] of RULES) {
        const hit = tokens.find(test);
        if (hit) check(`${rel} · ${name} '${hit}' → dark: 짝`, tokens.some((t) => need.test(t)), `"${raw.trim().slice(0, 70)}…"`);
      }
    }
  }
  check("클래스 문자열을 충분히 검사함", literals > 80, `${literals}개`);
  console.log(`  · 클래스 문자열 ${literals}개 검사`);
});

section("테마 구성 (토글 · 깜빡임 방지 · 변형 정의)", () => {
  const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
  const css = read("src/app/globals.css");
  const layout = read("src/app/layout.tsx");
  const toggle = read("src/components/ThemeToggle.tsx");
  const chrome = read("src/components/SiteChrome.tsx");
  check("dark 변형을 class 기준으로 정의", /@custom-variant dark \(&:where\(\.dark, \.dark \*\)\);/.test(css));
  check("다크에서 color-scheme: dark", /html\.dark\s*\{[^}]*color-scheme:\s*dark/.test(css));
  check("도구 iframe 다크 처리 규칙", /\.dark \.tool-iframe\s*\{[^}]*filter:/.test(css));
  check("layout: <head> 안 인라인 테마 스크립트", /<head>[\s\S]*dangerouslySetInnerHTML[\s\S]*<\/head>/.test(layout));
  check("layout: html 에 suppressHydrationWarning", /<html[^>]*suppressHydrationWarning/.test(layout));
  const key = (s) => (s.match(/["']app-theme["']/) || [""])[0].slice(1, -1);
  check("스크립트와 토글이 같은 저장 키(app-theme)", key(layout) === "app-theme" && key(toggle) === "app-theme");
  check("토글에 라이트·다크 두 버튼", /data-theme-option="light"/.test(toggle) && /data-theme-option="dark"/.test(toggle));
  check("모든 페이지 헤더가 토글을 포함", /<ThemeToggle \/>/.test(chrome));
  check("토글 버튼에 접근 가능한 이름", /aria-label="라이트 모드"/.test(toggle) && /aria-label="다크 모드"/.test(toggle));
});

console.log(`\n${failures === 0 ? "✅ 모두 통과" : `❌ 실패 ${failures}건`} (총 ${checks}개 검사)`);
process.exit(failures === 0 ? 0 : 1);
