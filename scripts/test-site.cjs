/*
 * 사이트 전체 섹션 브라우저 테스트 (서버 필요)
 * 준비: 앱 서버를 띄우고(npm run start 등) Chromium 설치(npx --yes playwright install chromium)
 * 실행: SITE_URL=http://127.0.0.1:3000 npx --yes --package=playwright -c 'node scripts/test-site.cjs'
 * 일부만: SECTIONS=api,catalog  (api · catalog · modal · filters · detail · interact · theme · nav · tools · mobile)
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { loadTs, root } = require("./lib/load-ts.cjs");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    const exe = execFileSync("which", ["playwright"], { encoding: "utf8" }).trim();
    return require(path.dirname(fs.realpathSync(exe)));
  }
}
const { chromium } = loadPlaywright();

const BASE = (process.env.SITE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const WANT = process.env.SECTIONS ? new Set(process.env.SECTIONS.split(",")) : null;
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
async function section(id, title, fn) {
  if (WANT && !WANT.has(id)) return;
  const before = { checks, failures };
  const t0 = Date.now();
  console.log(`\n■ ${title}`);
  try {
    await fn();
  } catch (e) {
    check(`${title} 실행 중 예외`, false, String(e.message).split("\n")[0]);
  }
  const n = checks - before.checks;
  const f = failures - before.failures;
  console.log(f === 0 ? `  ✓ ${n}개 항목 통과 (${((Date.now() - t0) / 1000).toFixed(1)}s)` : `  → ${n}개 중 ${f}개 실패`);
}

/** 페이지 오류·콘솔 오류·실패한 요청을 모아 두는 페이지 */
async function openPage(context, errors) {
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(`console.error: ${m.text().slice(0, 140)}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`HTTP ${r.status()}: ${r.url().replace(BASE, "")}`);
  });
  page.on("dialog", (d) => d.accept().catch(() => {}));
  return page;
}
const num = async (loc) => Number((await loc.first().innerText()).replace(/[^\d]/g, ""));
const cardSlugs = (scope) => scope.locator('[data-testid="tool-card"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-slug")));

/**
 * 화면의 모든 글자(와 지정한 아이콘 버튼)를 WCAG 색 대비로 검사한다.
 * - 보이는 글자만, 그 글자 뒤의 실제 배경(반투명 겹침·그라데이션 포함)과 비교
 * - 글자 4.5:1, 큰 글자(24px↑ 또는 굵은 18.7px↑) 3:1, 아이콘 3:1
 */
const contrastAudit = (page, iconSelector = "") =>
  page.evaluate((iconSel) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const cache = new Map();
    const parse = (css) => {
      if (cache.has(css)) return cache.get(css);
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#123456";
      ctx.fillStyle = css;
      let out = null;
      if (ctx.fillStyle !== "#123456") {
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
      }
      cache.set(css, out);
      return out;
    };
    const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
    const tokens = (str) => str.match(/(?:oklch|oklab|lab|lch|color|rgba?|hsla?)\([^()]*\)/g) || [];

    // 요소 뒤에 깔린 배경 후보들(그라데이션이면 각 색 지점)
    const backdrops = (el) => {
      const layers = [];
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.backgroundImage && /gradient/.test(cs.backgroundImage)) {
          const stops = tokens(cs.backgroundImage).map(parse).filter(Boolean);
          if (stops.length) { layers.push(stops); break; }
        }
        const c = parse(cs.backgroundColor);
        if (c && c[3] > 0) { layers.push([c]); if (c[3] >= 0.99) break; }
      }
      let cands = [[255, 255, 255]];
      for (let i = layers.length - 1; i >= 0; i--) {
        const next = [];
        for (const base of cands) for (const stop of layers[i]) next.push(over(stop, base));
        cands = next.slice(0, 32);
      }
      return cands;
    };
    const worst = (fgs, bgs) => {
      let min = Infinity;
      for (const bg of bgs) for (const fg of fgs) min = Math.min(min, ratio(over(fg, bg), bg));
      return min;
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      let opacity = 1;
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        opacity *= parseFloat(cs.opacity);
      }
      return opacity >= 0.2;
    };

    const failures = [];
    let checked = 0;
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.nodeValue.trim()) continue;
      const el = t.parentElement;
      if (!el || seen.has(el) || el.closest('script,style,noscript,iframe,svg,[aria-hidden="true"]')) continue;
      seen.add(el);
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      const text = parse(cs.color);
      if (!text) continue;
      const clipped = (cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text") && text[3] === 0;
      const fgs = clipped ? tokens(cs.backgroundImage).map(parse).filter(Boolean) : [text];
      if (!fgs.length) continue;
      const bgs = backdrops(clipped ? el.parentElement : el);
      const size = parseFloat(cs.fontSize);
      const need = size >= 24 || (size >= 18.66 && (parseInt(cs.fontWeight) || 400) >= 700) ? 3 : 4.5;
      const got = worst(fgs, bgs);
      checked++;
      if (got < need) failures.push({ text: t.nodeValue.trim().slice(0, 26), el: `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")}`, ratio: Math.round(got * 100) / 100, need });
    }
    for (const el of document.querySelectorAll("input, textarea, select")) {
      if (!visible(el)) continue;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      if (!fg) continue;
      checked++;
      const got = worst([fg], backdrops(el));
      if (got < 4.5) failures.push({ text: `(입력칸 ${el.getAttribute("aria-label") || el.name || el.type})`, el: el.tagName.toLowerCase(), ratio: Math.round(got * 100) / 100, need: 4.5 });
    }
    const iconFailures = [];
    if (iconSel) {
      for (const el of document.querySelectorAll(iconSel)) {
        const fg = parse(getComputedStyle(el).color);
        const got = worst([fg], backdrops(el));
        if (got < 3) iconFailures.push({ el: el.getAttribute("aria-label") || el.tagName, ratio: Math.round(got * 100) / 100 });
      }
    }
    return { checked, failures, iconFailures };
  }, iconSelector);

const api = async (method, body, raw) => {
  const res = await fetch(`${BASE}/api/copy`, {
    method,
    headers: { "content-type": "application/json" },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  let data = null;
  try { data = await res.json(); } catch { /* 본문 없음 */ }
  return { status: res.status, data };
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = (opts = {}) => browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul", viewport: { width: 1280, height: 900 }, ...opts });
  const progress = C.catalogProgress();
  const allTools = [...T.TOOLS, ...T.PLANNED_TOOLS];

  await section("api", "API · 헬스체크", async () => {
    const health = await fetch(`${BASE}/api/health`);
    check("GET /api/health → 200", health.status === 200);
    const get = await api("GET");
    check("GET /api/copy → 200 + counts", get.status === 200 && typeof get.data?.counts === "object");
    check("잘못된 JSON → 400", (await api("POST", undefined, "not json")).status === 400);
    check("slug 없음 → 400", (await api("POST", { kind: "code" })).status === 400);
    check("잘못된 kind → 400", (await api("POST", { slug: T.TOOLS[0].slug, kind: "hack" })).status === 400);
    check("목록에 없는 도구 → 404(집계 안 함)", (await api("POST", { slug: "not-a-tool", kind: "code" })).status === 404);
    check("404로 거절된 도구가 DB에 생기지 않음", !(await api("GET")).data.counts["not-a-tool"]);
    const slug = T.TOOLS[0].slug;
    const before = (await api("GET")).data.counts[slug] ?? { code: 0, prompt: 0 };
    const p = await api("POST", { slug, kind: "prompt" });
    check("프롬프트 복사 +1", p.status === 200 && p.data.prompt === before.prompt + 1 && p.data.code === before.code, JSON.stringify(p.data));
    const c = await api("POST", { slug, kind: "code" });
    check("코드 복사 +1", c.status === 200 && c.data.code === before.code + 1 && c.data.prompt === before.prompt + 1, JSON.stringify(c.data));
    const burst = await Promise.all(Array.from({ length: 8 }, () => api("POST", { slug, kind: "code" })));
    const after = (await api("GET")).data.counts[slug];
    check("동시 8회 요청도 유실 없이 +8", after.code === before.code + 1 + 8, `${after.code} (기대 ${before.code + 9})`);
    check("동시 요청 모두 200", burst.every((r) => r.status === 200));
  });

  await section("catalog", "카탈로그 화면 (/tools)", async () => {
    const errors = [];
    const context = await ctx();
    const page = await openPage(context, errors);
    const res = await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    check("HTTP 200", res.status() === 200);
    check("문서 제목에 업무앱·업무효율 100", /업무앱/.test(await page.title()) && /업무효율 100/.test(await page.title()), await page.title());
    check("h1은 하나, '업무효율 100'", (await page.locator("h1").count()) === 1 && /업무효율\s*100/.test(await page.locator("h1").innerText()));

    const brand = page.locator('a[aria-label="업무앱 홈"]').first();
    const box = await brand.boundingBox();
    check("좌상단 로고 텍스트 '업무앱'", (await brand.innerText()).trim().split("\n")[0] === "업무앱");
    check("로고가 화면 좌상단에 위치", Boolean(box) && box.x < 200 && box.y < 120, JSON.stringify(box));
    check("html lang=ko", (await page.locator("html").getAttribute("lang")) === "ko");

    check(`상단 '지금 바로 쓰기' = ${progress.ready}`, (await num(page.getByTestId("stat-ready-value"))) === progress.ready);
    check(`상단 '준비 중' = ${progress.planned}`, (await num(page.getByTestId("stat-planned-value"))) === progress.planned);
    check(`상단 '전체' = ${progress.total}`, (await num(page.getByTestId("stat-total-value"))) === progress.total);
    check("진행 막대 aria 값", (await page.getByRole("progressbar").first().getAttribute("aria-valuenow")) === String(progress.ready));
    check(`'지금 보이는 도구' = ${progress.total}`, (await num(page.getByTestId("visible-total"))) === progress.total);

    const sections = page.getByTestId("category-section");
    const expectedCats = T.CATEGORIES.filter((c) => allTools.some((t) => t.category === c.id));
    check(`분야 섹션 ${expectedCats.length}개`, (await sections.count()) === expectedCats.length, `${await sections.count()}개`);
    const order = await sections.evaluateAll((els) => els.map((e) => e.getAttribute("data-category")));
    check("분야 섹션 순서 = 정의 순서", JSON.stringify(order) === JSON.stringify(expectedCats.map((c) => c.id)));
    for (const cat of expectedCats) {
      const sec = page.locator(`[data-testid="category-section"][data-category="${cat.id}"]`);
      const exReady = T.TOOLS.filter((t) => t.category === cat.id).map((t) => t.slug).sort();
      const exPlanned = T.PLANNED_TOOLS.filter((t) => t.category === cat.id).length;
      const got = (await cardSlugs(sec)).sort();
      check(`[${cat.id}] 완성 카드 ${exReady.length}개`, JSON.stringify(got) === JSON.stringify(exReady), got.join(","));
      check(`[${cat.id}] 준비 중 카드 ${exPlanned}개`, (await sec.getByTestId("planned-card").count()) === exPlanned);
      check(`[${cat.id}] 제목·설명 표시`, (await sec.locator("h2").first().innerText()).includes(cat.name) && (await sec.innerText()).includes(cat.tagline));
    }
    const allCardSlugs = await cardSlugs(page.locator('[data-testid="category-section"]'));
    check(`분야 섹션 안 완성 카드 합계 ${T.TOOLS.length} · 중복 없음`, allCardSlugs.length === T.TOOLS.length && new Set(allCardSlugs).size === T.TOOLS.length);
    check(`준비 중 카드 합계 ${T.PLANNED_TOOLS.length}`, (await page.getByTestId("planned-card").count()) === T.PLANNED_TOOLS.length);
    const wave1Count = T.PLANNED_TOOLS.filter((t) => t.wave === 1).length;
    check(`'다음 제작' 표시 ${wave1Count}개`, (await page.locator('[data-testid="planned-card"][data-wave="1"]').count()) === wave1Count);
    check("준비 중 카드는 링크가 아님", (await page.locator('[data-testid="planned-card"] a').count()) === 0);

    // NEW
    const newSlugs = [...T.newToolSlugs()].sort();
    const newInCats = (await page.locator('[data-testid="category-section"] [data-testid="tool-card"]:has([data-testid="new-badge"])').evaluateAll((els) => els.map((e) => e.getAttribute("data-slug")))).sort();
    check(`분야 섹션 NEW 배지 = 최근 2개(${newSlugs.join(", ")})`, JSON.stringify(newInCats) === JSON.stringify(newSlugs), newInCats.join(","));
    const newSec = page.getByTestId("new-section");
    const expectedOrder = [...T.TOOLS].filter((t) => newSlugs.includes(t.slug)).sort((a, b) => b.addedAt - a.addedAt).map((t) => t.slug);
    check("NEW 섹션: 2개, 최신 순", JSON.stringify(await cardSlugs(newSec)) === JSON.stringify(expectedOrder));

    // 썸네일 위에는 아무 배지도 없어야 한다
    const thumbText = await page.getByTestId("tool-thumb").evaluateAll((els) => els.map((e) => e.innerText.replace(/크게 보기|⤢/g, "").trim()));
    check("모든 썸네일 위에 '크게 보기' 외 텍스트(배지) 없음", thumbText.every((t) => t === ""), thumbText.find((t) => t) ?? "");
    check("카드 어디에도 '바로 쓰기' 배지 문구 없음", (await page.locator('[data-testid="tool-card"]').evaluateAll((els) => els.filter((e) => /바로 쓰기/.test(e.innerText)).length)) === 0);
    check("모달 이미지는 열기 전엔 불러오지 않음", (await page.locator("dialog img").count()) === 0);

    // 썸네일 로딩
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('[data-testid="tool-thumb"] img')) {
        img.scrollIntoView({ block: "center" });
        await new Promise((r) => setTimeout(r, 40));
      }
    });
    const loaded = await page.waitForFunction(
      () => [...document.querySelectorAll('[data-testid="tool-thumb"] img')].every((i) => i.complete && i.naturalWidth === 878),
      null,
      { timeout: 15000 },
    ).then(() => true, () => false);
    check("모든 썸네일(878×560)이 실제로 로드됨", loaded);

    // 접근성
    const noAlt = await page.locator("img").evaluateAll((els) => els.filter((i) => !(i.getAttribute("alt") || "").trim()).length);
    check("모든 이미지에 alt", noAlt === 0, `${noAlt}개 누락`);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href]")].filter((el) => !(el.innerText || "").trim() && !el.getAttribute("aria-label")).map((el) => el.outerHTML.slice(0, 70)),
    );
    check("버튼·링크에 접근 가능한 이름", unnamed.length === 0, unnamed[0] ?? "");

    check("'이렇게 사용하세요' 섹션(#howto) 3단계", (await page.locator("#howto").count()) === 1 && (await page.locator("#howto >> text=열어서 바로 써요").count()) === 1);
    check("추천/순위 섹션 표시", (await page.getByTestId("featured-section").count()) === 1);
    check("푸터 로고 '업무앱'", (await page.locator("footer").innerText()).includes("업무앱"));
    check("페이지 오류·콘솔 오류·실패 요청 없음", errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  });

  await section("modal", "미리보기 모달", async () => {
    const errors = [];
    const context = await ctx();
    const page = await openPage(context, errors);
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    const first = page.locator('[data-testid="category-section"] [data-testid="tool-card"]').first();
    const slug = await first.getAttribute("data-slug");
    const tool = T.getTool(slug);
    await first.locator('button[aria-label$="화면 크게 보기"]').click();
    const dialog = first.locator("dialog");
    await dialog.waitFor({ state: "visible" });
    check("모달 열림", await dialog.evaluate((d) => d.open));
    const imgOk = await dialog.locator("img").evaluate((i) => new Promise((r) => (i.complete ? r(i.naturalWidth) : i.addEventListener("load", () => r(i.naturalWidth)))));
    check("모달 이미지 로드(878px)", imgOk === 878, String(imgOk));
    check("모달에 도구 이름·요약", (await dialog.innerText()).includes(tool.title) && (await dialog.innerText()).includes(tool.summary.slice(0, 15)));
    check("포커스가 닫기 버튼으로 이동", (await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))) === "미리보기 닫기");
    await page.keyboard.press("Escape");
    check("Esc로 닫힘", !(await dialog.evaluate((d) => d.open)));
    check("닫으면 이미지 제거", await dialog.locator("img").waitFor({ state: "detached", timeout: 2000 }).then(() => true, () => false));
    await first.locator('button[aria-label$="화면 크게 보기"]').click();
    await dialog.getByRole("button", { name: "미리보기 닫기" }).click();
    check("× 버튼으로 닫힘", !(await dialog.evaluate((d) => d.open)));
    await first.locator('button[aria-label$="화면 크게 보기"]').click();
    await dialog.getByRole("link", { name: /바로 써 보기/ }).click();
    await page.waitForURL(`**/tools/${slug}`);
    check("'바로 써 보기' → 상세 페이지 이동", page.url().endsWith(`/tools/${slug}`));
    check("모달 사용 중 오류 없음", errors.length === 0, errors[0] ?? "");
    await context.close();
  });

  await section("filters", "검색 · 필터", async () => {
    const errors = [];
    const context = await ctx();
    const page = await openPage(context, errors);
    const counts = async () => ({
      ready: await num(page.getByTestId("visible-ready")),
      planned: await num(page.getByTestId("visible-planned")),
      total: await num(page.getByTestId("visible-total")),
    });
    const expected = (q) => { const r = C.filterCatalog(C.parseQuery(q)); return { ready: r.ready.length, planned: r.planned.length, total: r.ready.length + r.planned.length }; };
    const same = (a, b) => a.ready === b.ready && a.planned === b.planned && a.total === b.total;
    const chip = (group, label) => page.locator(`[data-testid="filter-chip"][data-group="${group}"]`).filter({ hasText: new RegExp(`^${label}$`) });

    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    check("처음에는 '전체' 칩 3개가 선택 상태", (await page.locator('[data-testid="filter-chip"][aria-current="true"]').count()) === 3);

    // 업무 장면 칩
    await chip("cat", "알바·무인매장").click();
    await page.waitForURL(/cat=/);
    check("업무 장면 칩 → URL에 cat", new URL(page.url()).searchParams.get("cat") === "알바·무인매장");
    check("해당 분야 섹션 하나만 표시", (await page.getByTestId("category-section").count()) === 1);
    check("개수가 데이터와 일치", same(await counts(), expected({ cat: "알바·무인매장" })), JSON.stringify(await counts()));
    check("선택된 칩에 aria-current", (await chip("cat", "알바·무인매장").getAttribute("aria-current")) === "true");

    // 조합: 대상
    await chip("role", "알바·직원").click();
    await page.waitForURL(/role=/);
    check("업무 장면 + 대상 조합", same(await counts(), expected({ cat: "알바·무인매장", role: "알바·직원" })), JSON.stringify(await counts()));

    // 같은 칩을 다시 누르면 해제
    await chip("cat", "알바·무인매장").click();
    await page.waitForFunction(() => !new URL(location.href).searchParams.has("cat"));
    check("선택된 칩을 다시 누르면 해제", !new URL(page.url()).searchParams.has("cat") && new URL(page.url()).searchParams.get("role") === "알바·직원");
    check("해제 후 개수 일치", same(await counts(), expected({ role: "알바·직원" })));

    // 모양
    await chip("shape", "사진 기록").click();
    await page.waitForURL(/shape=/);
    check("대상 + 모양 조합", same(await counts(), expected({ role: "알바·직원", shape: "사진 기록" })));

    // 전체 초기화
    for (const g of ["cat", "role", "shape"]) await page.locator(`[data-testid="filter-chip"][data-group="${g}"]`).first().click().catch(() => {});
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });

    // 검색
    await page.getByRole("searchbox", { name: "도구 검색" }).fill("회의");
    await page.getByRole("button", { name: "찾기" }).click();
    await page.waitForURL(/q=/);
    check("검색 '회의' 개수 일치", same(await counts(), expected({ q: "회의" })), JSON.stringify(await counts()));
    check("검색 결과에 회의 타이머 카드", (await page.locator('[data-testid="tool-card"][data-slug="meeting-timer"]').count()) >= 1);
    check("검색어가 입력창에 유지", (await page.getByRole("searchbox").inputValue()) === "회의");

    // 검색 + 필터 유지
    await chip("cat", "회의·소통").click();
    await page.waitForURL(/cat=/);
    check("검색어를 유지한 채 필터 추가", new URL(page.url()).searchParams.get("q") === "회의" && same(await counts(), expected({ q: "회의", cat: "회의·소통" })));

    // 결과 없음
    await page.goto(`${BASE}/tools?q=zzzzzzzz`, { waitUntil: "networkidle" });
    check("결과 없음 → 빈 화면 안내", (await page.getByTestId("empty-state").count()) === 1 && (await num(page.getByTestId("visible-total"))) === 0);
    check("빈 화면에서 '전체 보기'로 복귀", await page.getByRole("link", { name: "전체 보기" }).isVisible());

    // 병원 분야 + 준비 중 항목만 남는 검색
    await page.goto(`${BASE}/tools?cat=${encodeURIComponent("병원·의료")}`, { waitUntil: "networkidle" });
    check("병원·의료 분야 개수가 데이터와 일치", same(await counts(), expected({ cat: "병원·의료" })), JSON.stringify(await counts()));
    await page.goto(`${BASE}/tools?q=${encodeURIComponent("마진")}`, { waitUntil: "networkidle" });
    const marginExp = expected({ q: "마진" });
    check("'마진' 검색 개수가 데이터와 일치", same(await counts(), marginExp), JSON.stringify(await counts()));
    if (marginExp.ready === 0 && marginExp.planned > 0) {
      check("완성 도구가 없는 분야 안내 문구", (await page.getByTestId("category-section").first().innerText()).includes("아직 완성된 도구가 없어요"));
    }

    // 잘못된 값
    await page.goto(`${BASE}/tools?cat=${encodeURIComponent("없는분야")}&role=x&shape=y`, { waitUntil: "networkidle" });
    check("알 수 없는 필터 값은 무시하고 전체 표시", same(await counts(), expected({})) && (await page.getByTestId("empty-state").count()) === 0);
    const xssPayload = "<img src=x onerror=alert(1)><script>alert(1)</script>";
    let alerted = false;
    const xssPage = await context.newPage();
    xssPage.on("dialog", (d) => {
      alerted = true;
      d.dismiss().catch(() => {});
    });
    await xssPage.goto(`${BASE}/tools?q=${encodeURIComponent(xssPayload)}`, { waitUntil: "networkidle" });
    await xssPage.waitForTimeout(300);
    check("검색어에 스크립트를 넣어도 실행되지 않음", !alerted);
    check("검색어가 이스케이프되어 입력창에 그대로 표시", (await xssPage.getByRole("searchbox").inputValue()) === xssPayload);
    check("주입한 <img>가 실제 요소로 생기지 않음", (await xssPage.locator('img[src="x"]').count()) === 0);
    await xssPage.close();
    check("필터·검색 중 오류 없음", errors.length === 0, errors[0] ?? "");
    await context.close();
  });

  await section("detail", "도구 상세 페이지(전체)", async () => {
    const errors = [];
    const context = await ctx();
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    const page = await openPage(context, errors);
    const newSlugs = T.newToolSlugs();
    const clipboardTargets = new Set([T.TOOLS[0].slug, [...newSlugs][0], T.TOOLS.at(-1).slug]);

    for (const tool of T.TOOLS) {
      const tag = `[${tool.slug}]`;
      const res = await page.goto(`${BASE}/tools/${tool.slug}`, { waitUntil: "load" });
      check(`${tag} HTTP 200`, res.status() === 200);
      check(`${tag} 문서 제목`, (await page.title()).includes(tool.title), await page.title());
      check(`${tag} h1에 도구 이름`, (await page.locator("h1").innerText()).includes(tool.title));
      check(`${tag} NEW 배지 규칙`, ((await page.locator("h1 [data-testid=new-badge]").count()) === 1) === newSlugs.has(tool.slug));
      check(`${tag} 좌상단 로고 '업무앱'`, (await page.locator('header a[aria-label="업무앱 홈"]').first().innerText()).trim().split("\n")[0] === "업무앱");

      const frame = page.frameLocator(`iframe[title="${tool.title}"]`);
      const framed = await frame.locator("h1").first().innerText({ timeout: 8000 }).then((t) => t.length > 0, () => false);
      check(`${tag} 도구 본체(iframe) 렌더링`, framed);

      for (const id of ["section-usecases", "section-tips", "section-prompt"]) {
        check(`${tag} 섹션 ${id}`, (await page.getByTestId(id).count()) === 1);
      }
      check(`${tag} 이럴 때 좋아요 카드 ${tool.useCases.length}개`, (await page.getByTestId("section-usecases").locator("p.font-bold").count()) === tool.useCases.length);
      check(`${tag} 바꿔 보기 ${tool.changeTips.length}개`, (await page.getByTestId("section-tips").locator("li").count()) === tool.changeTips.length);
      const related = T.TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug).length;
      check(`${tag} 같은 분야 도구 ${related}개`, (await page.getByTestId("section-related").locator('[data-testid="tool-card"]').count()) === related);
      check(`${tag} 프롬프트 본문 표시`, (await page.getByTestId("section-prompt").locator("pre").first().innerText()).startsWith(`[업무 도구 주문서] ${tool.title}`));
      check(`${tag} 복사·열기 버튼`, (await page.getByRole("button", { name: /코드 복사/ }).count()) >= 1 && (await page.getByRole("button", { name: /AI 프롬프트 복사/ }).count()) === 1 && (await page.getByRole("link", { name: /새 탭에서 열기/ }).getAttribute("href")) === `/tools/${tool.slug}.html`);

      if (clipboardTargets.has(tool.slug)) {
        const before = (await api("GET")).data.counts[tool.slug] ?? { code: 0, prompt: 0 };
        await page.getByRole("button", { name: /^📋 코드 복사/ }).click();
        await page.getByText("코드가 복사됐어요").waitFor({ timeout: 5000 });
        const html = fs.readFileSync(path.join(root, "public/tools", `${tool.slug}.html`), "utf8");
        check(`${tag} 코드 복사 → 클립보드가 HTML 파일과 동일`, (await page.evaluate(() => navigator.clipboard.readText())) === html);
        await page.getByRole("button", { name: /AI 프롬프트 복사/ }).click();
        await page.getByText("AI 프롬프트가 복사됐어요").waitFor({ timeout: 5000 });
        check(`${tag} 프롬프트 복사 → 클립보드가 주문서와 동일`, (await page.evaluate(() => navigator.clipboard.readText())) === T.buildPrompt(tool));
        await page.waitForTimeout(600);
        const after = (await api("GET")).data.counts[tool.slug];
        check(`${tag} 복사 횟수 집계 +1/+1`, after.code === before.code + 1 && after.prompt === before.prompt + 1, JSON.stringify({ before, after }));
        await page.getByRole("button", { name: "🔍 코드 보기" }).click();
        check(`${tag} 코드 보기 → 소스 표시`, (await page.locator("pre code").first().innerText()).trimStart().toLowerCase().startsWith("<!doctype html>"));
        await page.getByRole("button", { name: "코드 접기" }).click();
        check(`${tag} 코드 접기`, (await page.locator("pre code").count()) === 0);
      }
    }
    check("상세 페이지 전체 순회 중 오류 없음", errors.length === 0, errors.slice(0, 2).join(" | "));
    const missing = await page.goto(`${BASE}/tools/not-a-tool`, { waitUntil: "load" });
    check("없는 도구 → 404", missing.status() === 404);
    await context.close();
  });

  await section("tools", "도구 전체 실행 점검 (모든 버튼 클릭)", async () => {
    const only = process.env.ONLY_TOOLS ? new Set(process.env.ONLY_TOOLS.split(",")) : null;
    for (const tool of T.TOOLS.filter((t) => !only || only.has(t.slug))) {
      const errors = [];
      const external = [];
      const context = await ctx({ viewport: { width: 1100, height: 800 }, acceptDownloads: true });
      const page = await openPage(context, errors);
      page.on("request", (r) => {
        const u = r.url();
        if (!u.startsWith(BASE) && !/^(data|blob|about):/.test(u)) external.push(u);
      });
      const res = await page.goto(`${BASE}/tools/${tool.slug}.html`, { waitUntil: "networkidle" });
      const tag = `[${tool.slug}]`;
      check(`${tag} HTTP 200`, res.status() === 200);
      check(`${tag} 첫 화면에 제목(h1)`, (await page.locator("h1").count()) >= 1);
      check(`${tag} '이럴 때 좋아요' 섹션`, (await page.locator("body").innerText()).includes("이럴 때 좋아요"));
      // 입력칸이 있으면 먼저 채워 본다(작성 중 내용도 저장되는지 확인)
      const field = page.locator('textarea:visible, input[type="text"]:visible, input:not([type]):visible').first();
      if (await field.count()) await field.fill("테스트 입력").catch(() => {});
      const total = await page.locator("button:visible").count();
      let clicked = 0;
      for (let i = 0; i < total; i++) {
        const btn = page.locator("button:visible").nth(i);
        if (await btn.click({ timeout: 1200 }).then(() => true, () => false)) clicked++;
        // '크게 보기'처럼 전체 화면으로 바뀌는 도구는 닫아 가며 계속 누른다
        await page.evaluate(() => document.fullscreenElement && document.exitFullscreen()).catch(() => {});
        await page.waitForTimeout(15);
      }
      // 삭제 버튼처럼 누르면 사라지는 버튼이 있어 '전부 클릭'은 요구하지 않고, 상호작용이 실제로 가능한지만 본다.
      check(`${tag} 버튼 클릭 가능 (${clicked}/${total}개)`, clicked >= Math.min(total, 4));
      await page.waitForTimeout(250);
      const persisted = await page.evaluate(() => Object.keys(localStorage).length);
      await page.reload({ waitUntil: "networkidle" });
      check(`${tag} 상태 저장(localStorage)`, persisted >= 1, `${persisted}개 키`);
      check(`${tag} 새로고침 후에도 정상`, (await page.locator("h1").count()) >= 1);
      check(`${tag} 외부 요청 없음(오프라인 동작)`, external.length === 0, external[0] ?? "");
      check(`${tag} 스크립트 오류·콘솔 오류 없음`, errors.length === 0, errors[0] ?? "");
      await context.close();
    }
  });

  await section("mobile", "모바일(375px) 가로 넘침", async () => {
    const context = await ctx({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true });
    const errors = [];
    const page = await openPage(context, errors);
    const overflow = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    for (const url of ["/tools", `/tools?cat=${encodeURIComponent("알바·무인매장")}`, `/tools/${T.TOOLS[0].slug}`]) {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const o = await overflow();
      check(`페이지 ${decodeURIComponent(url)} 가로 넘침 없음`, o.sw <= o.iw + 1, `${o.sw} > ${o.iw}`);
    }
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    check("모바일에서도 로고 '업무앱' 표시", await page.locator('a[aria-label="업무앱 홈"]').first().isVisible());
    for (const tool of T.TOOLS) {
      await page.goto(`${BASE}/tools/${tool.slug}.html`, { waitUntil: "networkidle" });
      const o = await overflow();
      check(`[${tool.slug}] 가로 넘침 없음`, o.sw <= o.iw + 1, `${o.sw} > ${o.iw}`);
    }
    check("모바일 순회 중 오류 없음", errors.length === 0, errors[0] ?? "");
    await context.close();
  });

  await section("interact", "주요 상호작용 (iframe 안 크게 보기 · 키보드 · 자동 저장)", async () => {
    const errors = [];
    const context = await ctx();
    const page = await openPage(context, errors);

    // 회의 타이머: 상세 페이지(iframe) 안에서도 '크게 보기'가 동작해야 한다
    await page.goto(`${BASE}/tools/meeting-timer`, { waitUntil: "load" });
    const frame = page.frameLocator('iframe[title="회의 타이머"]');
    await frame.locator("#btnBig").waitFor();
    const isBig = () => frame.locator("#bigBox").evaluate((el) => el.classList.contains("bigmode") || document.fullscreenElement === el);
    await frame.locator("#btnBig").click();
    await page.waitForTimeout(250);
    check("iframe 안에서 '크게 보기' → 확대됨", await isBig());
    check("확대 상태에서 키보드 안내 표시", await frame.locator(".bighint").isVisible());
    // 브라우저 전체 화면에서 Esc로 나오는 동작을 모사
    await frame.locator("body").evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : null));
    await page.waitForTimeout(250);
    check("전체 화면에서 나오면 원래 크기로", !(await isBig()));

    // 전체 화면이 막힌 환경(회사 PC·일부 미리보기)에서는 화면 안에서 크게 보여야 한다
    await frame.locator("body").evaluate(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new Error("blocked"));
    });
    await frame.locator("#btnBig").click();
    await page.waitForTimeout(250);
    check("전체 화면이 막혀도 화면 안에서 크게 보기(대체 동작)", await frame.locator("#bigBox").evaluate((el) => el.classList.contains("bigmode")));
    check("대체 확대가 화면을 가득 채움", await frame.locator("#bigBox").evaluate((el) => { const r = el.getBoundingClientRect(); return r.width >= innerWidth - 2 && r.height >= innerHeight - 2; }));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    check("Esc로 대체 확대 닫기", !(await isBig()));

    // 키보드: 스페이스=시작, →=다음 안건
    await frame.locator("#tName").click();
    await page.keyboard.press("Space");
    await page.waitForTimeout(300);
    check("스페이스 → 타이머 시작(버튼이 일시정지로)", (await frame.locator("#btnStart").innerText()).includes("일시정지"));
    const first = await frame.locator("#tName").innerText();
    check("진행 중에는 지금 안건 이름과 순서가 표시됨", /\(1\/\d+\)/.test(first) && !first.includes("시작 버튼"), first);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    const second = await frame.locator("#tName").innerText();
    check("→ 키 → 다음 안건으로 이동", /\(2\/\d+\)/.test(second) && second !== first, `${first} → ${second}`);
    await frame.locator("#btnReset").click();
    await frame.locator("#btnReset").click();
    check("처음으로(두 번 눌러 확인) → 첫 화면", (await frame.locator("#tName").innerText()).includes("시작 버튼"));

    // 자동 저장: 새로고침해도 입력이 남아야 한다
    await page.goto(`${BASE}/tools/focus-timer.html`, { waitUntil: "networkidle" });
    await page.locator("#taskInput").fill("3분기 기획서 쓰기");
    await page.reload({ waitUntil: "networkidle" });
    check("집중 타이머: '지금 집중할 일'이 새로고침 후에도 유지", (await page.locator("#taskInput").inputValue()) === "3분기 기획서 쓰기");

    await page.goto(`${BASE}/tools/meeting-minutes.html`, { waitUntil: "networkidle" });
    await page.locator("#mTitle").fill("주간 회의");
    await page.locator("#mAgenda").fill("안건 하나\n안건 둘");
    await page.reload({ waitUntil: "networkidle" });
    check("회의록: 작성 중이던 제목·안건이 새로고침 후에도 유지",
      (await page.locator("#mTitle").inputValue()) === "주간 회의" && (await page.locator("#mAgenda").inputValue()) === "안건 하나\n안건 둘");
    await page.locator("#btnNew").click();
    await page.reload({ waitUntil: "networkidle" });
    check("회의록: '새 회의록'을 누르면 초안도 지워짐", (await page.locator("#mTitle").inputValue()) === "");

    check("상호작용 중 오류 없음", errors.length === 0, errors[0] ?? "");
    await context.close();
  });

  await section("theme", "라이트 · 다크 모드", async () => {
    const errors = [];
    const sharp = require("sharp");
    const luma = async (page, clip) => {
      const { channels } = await sharp(await page.screenshot({ clip })).stats();
      return 0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean;
    };
    const isDark = (page) => page.evaluate(() => document.documentElement.classList.contains("dark"));
    const stored = (page) => page.evaluate(() => localStorage.getItem("app-theme"));
    const opt = (page, which) => page.locator(`[data-testid="theme-toggle"] [data-theme-option="${which}"]`);
    const bodyLuma = (page) => luma(page, { x: 0, y: 600, width: 10, height: 10 });
    const frameLuma = async (page) => {
      const box = await page.locator("iframe.tool-iframe").boundingBox();
      return luma(page, { x: box.x + 4, y: box.y + 4, width: 16, height: 16 });
    };
    const fmt = (a) => a.failures.slice(0, 3).map((f) => `'${f.text}' ${f.ratio}<${f.need} (${f.el})`).join(" | ");

    // ── 서버가 내려 주는 HTML: 깜빡임 방지 스크립트 ──
    const source = await (await fetch(`${BASE}/tools`)).text();
    check("깜빡임 방지 스크립트가 <head> 안, <body>보다 앞에 있음", source.includes("app-theme") && source.indexOf("app-theme") < source.indexOf("<body"));
    check("<html lang=ko> 유지", /<html[^>]*lang="ko"/.test(source));

    // ── A. 기기 설정 라이트 · 저장값 없음 ──
    let context = await ctx({ colorScheme: "light" });
    let page = await openPage(context, errors);
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    const toggle = page.getByTestId("theme-toggle");
    check("헤더에 라이트·다크 아이콘 표시", await toggle.isVisible());
    check("아이콘 버튼 2개(해·달), 각각 svg", (await toggle.locator("button").count()) === 2 && (await toggle.locator("button svg").count()) === 2);
    check("접근 가능한 이름: 라이트 모드 · 다크 모드", (await opt(page, "light").getAttribute("aria-label")) === "라이트 모드" && (await opt(page, "dark").getAttribute("aria-label")) === "다크 모드");
    check("마우스 올리면 설명(title)", (await opt(page, "light").getAttribute("title")) === "라이트 모드" && (await opt(page, "dark").getAttribute("title")) === "다크 모드");

    const howto = page.locator('[data-testid="site-header"] a[href="/tools#howto"]');
    const hb = await howto.boundingBox();
    const tb = await toggle.boundingBox();
    const gap = tb.x - (hb.x + hb.width);
    check("'이렇게 사용하세요' 바로 오른쪽 옆", gap >= 0 && gap <= 24, `간격 ${Math.round(gap)}px`);
    check("같은 줄에 가운데 정렬", Math.abs(tb.y + tb.height / 2 - (hb.y + hb.height / 2)) < 8);
    check("터치하기 쉬운 크기(32px 이상)", (await opt(page, "dark").boundingBox()).width >= 32);

    check("기기가 라이트 → 처음에는 라이트", !(await isDark(page)));
    check("라이트 아이콘이 눌린 상태(aria-pressed)", (await opt(page, "light").getAttribute("aria-pressed")) === "true" && (await opt(page, "dark").getAttribute("aria-pressed")) === "false");
    check("라이트 화면은 밝음(배경 밝기 200 이상)", (await bodyLuma(page)) > 200, String(Math.round(await bodyLuma(page))));
    check("선택한 적 없으면 저장값 없음", (await stored(page)) === null);
    const sunBg = () => opt(page, "light").evaluate((el) => getComputedStyle(el).backgroundColor);
    const moonBg = () => opt(page, "dark").evaluate((el) => getComputedStyle(el).backgroundColor);
    check("라이트: 해 버튼만 켜진 모양(흰 알약), 달은 투명", (await sunBg()) !== "rgba(0, 0, 0, 0)" && (await moonBg()) === "rgba(0, 0, 0, 0)");
    const lightAudit = await contrastAudit(page, "[data-theme-option]");
    check("라이트: 아이콘 색 대비 3:1 이상", lightAudit.iconFailures.length === 0, JSON.stringify(lightAudit.iconFailures));

    // ── 다크로 전환 ──
    await opt(page, "dark").click();
    await page.waitForTimeout(500); // 색 전환 애니메이션이 끝난 뒤 측정
    check("달 클릭 → <html class=dark>", await isDark(page));
    check("color-scheme: dark 적용", (await page.evaluate(() => document.documentElement.style.colorScheme)) === "dark");
    check("선택이 저장됨(app-theme=dark)", (await stored(page)) === "dark");
    check("달 아이콘이 눌린 상태로 바뀜", (await opt(page, "dark").getAttribute("aria-pressed")) === "true" && (await opt(page, "light").getAttribute("aria-pressed")) === "false");
    check("다크: 달 버튼만 켜진 모양, 해는 투명", (await moonBg()) !== "rgba(0, 0, 0, 0)" && (await sunBg()) === "rgba(0, 0, 0, 0)");
    check("다크 화면은 어두움(배경 밝기 30 미만)", (await bodyLuma(page)) < 30, String(Math.round(await bodyLuma(page))));
    await opt(page, "dark").hover();
    const darkAudit = await contrastAudit(page, "[data-theme-option]");
    check(`다크: 화면 글자 ${darkAudit.checked}개가 모두 색 대비 기준 통과`, darkAudit.checked > 150 && darkAudit.failures.length === 0, `${darkAudit.checked}개 검사 · ${fmt(darkAudit)}`);
    check("다크: 아이콘(마우스 올린 상태 포함) 색 대비 3:1 이상", darkAudit.iconFailures.length === 0, JSON.stringify(darkAudit.iconFailures));

    // 카드 hover · 필터 칩 · 검색창 같은 상호작용 상태
    const card = page.locator('[data-testid="tool-card"]').first();
    await card.hover();
    await page.waitForTimeout(250);
    const hoverAudit = await contrastAudit(page);
    check("다크: 카드에 마우스를 올려도 글자가 읽힘", hoverAudit.failures.length === 0, fmt(hoverAudit));
    await page.getByRole("searchbox", { name: "도구 검색" }).focus();
    const focusAudit = await contrastAudit(page);
    check("다크: 검색창 포커스 상태 글자 대비", focusAudit.failures.length === 0, fmt(focusAudit));

    // 모달
    const first = page.locator('[data-testid="category-section"] [data-testid="tool-card"]').first();
    await first.locator('button[aria-label$="화면 크게 보기"]').click();
    const dialog = first.locator("dialog");
    await dialog.waitFor({ state: "visible" });
    await dialog.locator("img").evaluate((i) => (i.complete ? 0 : new Promise((r) => i.addEventListener("load", r))));
    const dbox = await dialog.boundingBox();
    check("다크: 모달 머리말 배경이 어두움", (await luma(page, { x: dbox.x + 6, y: dbox.y + 6, width: 8, height: 8 })) < 60);
    const modalAudit = await contrastAudit(page);
    check("다크: 모달 글자 색 대비", modalAudit.failures.length === 0, fmt(modalAudit));
    await page.keyboard.press("Escape");

    // 새로고침: 깜빡임 없이 유지
    await page.reload({ waitUntil: "domcontentloaded" });
    check("새로고침 직후(스크립트 실행 시점)에 이미 다크", await isDark(page));
    await page.waitForLoadState("networkidle");
    check("새로고침 후에도 다크 + 달 아이콘 켜짐", (await isDark(page)) && (await opt(page, "dark").getAttribute("aria-pressed")) === "true");

    // 다른 페이지(도구 상세)
    await page.goto(`${BASE}/tools/meeting-timer`, { waitUntil: "load" });
    check("도구 상세에서도 다크 유지", await isDark(page));
    check("도구 상세 헤더에도 아이콘", await page.getByTestId("theme-toggle").isVisible());
    const frame = page.frameLocator('iframe[title="회의 타이머"]');
    await frame.locator("h1").waitFor();
    await page.locator("iframe.tool-iframe").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const darkFrame = await frameLuma(page);
    check("다크: 도구 화면(iframe)도 어두워짐", darkFrame < 70, String(Math.round(darkFrame)));
    const detailAudit = await contrastAudit(page, "[data-theme-option]");
    check(`다크: 상세 페이지 글자 ${detailAudit.checked}개 색 대비 통과`, detailAudit.checked > 50 && detailAudit.failures.length === 0, `${detailAudit.checked}개 · ${fmt(detailAudit)}`);
    const sectionsDark = await page.locator('[data-testid^="section-"]').evaluateAll((els) => els.map((e) => getComputedStyle(e.querySelector("h2")).color));
    check("다크: 섹션 제목이 밝은 글자색", sectionsDark.length >= 4 && sectionsDark.every((c) => c && c !== "rgb(0, 0, 0)"));

    // 라이트로 되돌리기
    await opt(page, "light").click();
    await page.waitForTimeout(250);
    check("해 클릭 → 라이트 복귀 + 저장", !(await isDark(page)) && (await stored(page)) === "light");
    check("라이트에서 도구 화면(iframe)이 밝음", (await frameLuma(page)) > 200, String(Math.round(await frameLuma(page))));
    await page.reload({ waitUntil: "domcontentloaded" });
    check("새로고침 후에도 라이트", !(await isDark(page)));

    // 키보드
    await page.waitForLoadState("networkidle");
    await opt(page, "dark").focus();
    await page.keyboard.press("Enter");
    check("키보드(Enter)로 다크 전환", await isDark(page));
    await opt(page, "light").focus();
    await page.keyboard.press("Space");
    check("키보드(Space)로 라이트 전환", !(await isDark(page)));
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      const cs = el ? getComputedStyle(el) : null;
      return { toggle: Boolean(el && el.closest('[data-testid="theme-toggle"]')), style: cs && cs.outlineStyle, width: cs && parseFloat(cs.outlineWidth) };
    });
    await opt(page, "light").focus();
    await page.keyboard.press("Tab");
    const onDark = await opt(page, "dark").evaluate((el) => ({ focused: document.activeElement === el, style: getComputedStyle(el).outlineStyle, width: parseFloat(getComputedStyle(el).outlineWidth) }));
    check("Tab으로 이동하면 아이콘에 포커스 아웃라인(2px)이 보임", onDark.focused && onDark.style !== "none" && onDark.width >= 2, JSON.stringify({ focused, onDark }));

    // 탭 사이 동기화
    const other = await openPage(context, errors);
    await other.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    await opt(page, "dark").click();
    const synced = await other.waitForFunction(() => document.documentElement.classList.contains("dark"), null, { timeout: 4000 }).then(() => true, () => false);
    check("한 탭에서 바꾸면 열려 있는 다른 탭도 따라 바뀜", synced);
    await opt(page, "light").click();
    const syncedBack = await other.waitForFunction(() => !document.documentElement.classList.contains("dark"), null, { timeout: 4000 }).then(() => true, () => false);
    check("되돌릴 때도 다른 탭이 따라 바뀜", syncedBack);
    await other.close();
    await context.close();

    // ── B. 기기 설정이 다크 ──
    context = await ctx({ colorScheme: "dark" });
    page = await openPage(context, errors);
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    check("기기가 다크 + 저장값 없음 → 처음부터 다크", await isDark(page));
    check("이때 달 아이콘이 켜져 있음", (await opt(page, "dark").getAttribute("aria-pressed")) === "true");
    check("자동으로 따라간 것은 저장하지 않음", (await stored(page)) === null);
    await opt(page, "light").click();
    check("기기는 다크여도 사용자가 라이트를 고르면 라이트", !(await isDark(page)) && (await stored(page)) === "light");
    await page.reload({ waitUntil: "networkidle" });
    check("그 선택이 기기 설정보다 우선", !(await isDark(page)));
    await context.close();

    // ── C. 저장값 우선 · 기기 설정 변경 따라가기 ──
    context = await ctx({ colorScheme: "dark" });
    await context.addInitScript(() => { if (!localStorage.getItem("app-theme")) localStorage.setItem("app-theme", "light"); });
    page = await openPage(context, errors);
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    check("저장값(light)이 기기 다크보다 우선", !(await isDark(page)));
    await context.close();

    context = await ctx({ colorScheme: "light" });
    page = await openPage(context, errors);
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    await page.emulateMedia({ colorScheme: "dark" });
    const followed = await page.waitForFunction(() => document.documentElement.classList.contains("dark"), null, { timeout: 3000 }).then(() => true, () => false);
    check("저장값이 없으면 기기 설정이 바뀔 때 따라감", followed);
    await opt(page, "light").click();
    await page.emulateMedia({ colorScheme: "light" });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForTimeout(300);
    check("직접 고른 뒤에는 기기 설정이 바뀌어도 선택 유지", !(await isDark(page)));
    await context.close();

    // ── D. 모바일(375px) · 다크 ──
    context = await ctx({ viewport: { width: 375, height: 800 }, isMobile: true, hasTouch: true, colorScheme: "dark" });
    page = await openPage(context, errors);
    for (const url of ["/tools", "/tools/meeting-timer", `/tools?cat=${encodeURIComponent("병원·의료")}`]) {
      await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
      const box = await page.getByTestId("theme-toggle").boundingBox();
      check(`모바일 다크 ${decodeURIComponent(url)}: 가로 넘침 없음`, o.sw <= o.iw + 1, `${o.sw}>${o.iw}`);
      check(`모바일 다크 ${decodeURIComponent(url)}: 아이콘이 화면 안`, Boolean(box) && box.x >= 0 && box.x + box.width <= o.iw);
    }
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    await page.getByTestId("theme-toggle").locator('[data-theme-option="light"]').tap();
    check("모바일에서 터치로 라이트 전환", !(await isDark(page)));
    await page.getByTestId("theme-toggle").locator('[data-theme-option="dark"]').tap();
    check("모바일에서 터치로 다크 전환", await isDark(page));
    await page.waitForTimeout(500); // 색 전환 애니메이션(0.15초)이 끝난 뒤 측정
    const mobileAudit = await contrastAudit(page);
    check("모바일 다크: 글자 색 대비 통과", mobileAudit.failures.length === 0, fmt(mobileAudit));
    await context.close();

    check("테마 전환 중 콘솔·페이지 오류 없음(hydration 포함)", errors.length === 0, errors.slice(0, 2).join(" | "));
  });

  await section("nav", "작업경로(빵부스크기) · 이전·다음 이동", async () => {
    const errors = [];
    const context = await ctx();
    const page = await openPage(context, errors);
    const crumbItems = (scope) => scope.locator('[data-testid="breadcrumb"] > ol > li').evaluateAll((els) =>
      els.filter((e) => !(e.getAttribute("aria-hidden") === "true"))
        .map((e) => ({ text: (e.innerText || "").trim(), href: e.querySelector("a")?.getAttribute("href") || null, current: e.querySelector('[aria-current="page"]') !== null })),
    );
    const CRUMB_LI = '[data-testid="breadcrumb-bar"] [data-testid="breadcrumb"] > ol > li:not([aria-hidden="true"])';
    const navCounts = async () => ({
      crumbs: await page.locator(CRUMB_LI).count(),
      withLinks: await page.locator('[data-testid="breadcrumb-bar"] [data-testid="breadcrumb"] a').count(),
      current: await page.locator('[data-testid="breadcrumb-bar"] [aria-current="page"]').count(),
      bars: await page.getByTestId("breadcrumb-bar").count(),
    });

    // ── 카탈로그 ──
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    let n = await navCounts();
    check("카탈로그에 작업경로 줄이 하나", n.bars === 1 && n.crumbs === 2, JSON.stringify(n));
    check("카탈로그: 마지막 항목만 현재 위치", n.current === 1 && n.withLinks === 1);
    let items = await crumbItems(page.getByTestId("breadcrumb-bar"));
    check("카탈로그 작업경로: 업무앱 › 전체 도구", items.map((i) => i.text).join("›") === "업무앱›전체 도구", JSON.stringify(items));
    check("카탈로그: 첫 항목이 사전으로 연결", items[0].href === "/tools");
    check("작업경로가 헤더 바로 아래에 위치", await page.locator('[data-testid="breadcrumb-bar"]').evaluate((bar) => {
      const header = document.querySelector('[data-testid="site-header"]');
      return header ? bar.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1 : false;
    }));

    // ── 도구 상세 ──
    const target = T.TOOLS.find((t) => t.category === "알바·무인매장") ?? T.TOOLS[0];
    await page.goto(`${BASE}/tools/${target.slug}`, { waitUntil: "networkidle" });
    n = await navCounts();
    check("상세에 작업경로 줄이 하나", n.bars === 1);
    check("상세 작업경로가 3단계(업무앱 › 분야 › 도구)", n.crumbs === 3, JSON.stringify(n));
    items = await crumbItems(page.getByTestId("breadcrumb-bar"));
    check("상세 작업경로 문구가 맞음", items[0].text === "업무앱" && items[1].text === target.category && items[2].text === target.title, JSON.stringify(items.map((i) => i.text)));
    check("상세: 마지막 항목(도구명)만 현재 위치", n.current === 1 && n.withLinks === 2);
    check("분야 항목이 필터링된 목록으로 연결", items[1].href === `/tools?cat=${encodeURIComponent(target.category)}`, items[1].href);
    check("상세 작업경로가 헤더 바로 아래", await page.locator('[data-testid="breadcrumb-bar"]').evaluate((bar) => {
      const header = document.querySelector('[data-testid="site-header"]');
      return header ? bar.getBoundingClientRect().top >= header.getBoundingClientRect().bottom - 1 : false;
    }));

    // 분야 링크로 실제 이동
    const catLink = page.locator('[data-testid="breadcrumb-bar"] [data-testid="breadcrumb"] a').nth(1);
    check("분야 링크가 실제로 존재", (await catLink.count()) === 1);
    await catLink.click();
    await page.waitForURL(/cat=/);
    check("분야 링크를 누르면 해당 분야만 보임", (await page.getByTestId("category-section").count()) === 1 && (await page.getByTestId("visible-ready").innerText()).trim() === String(T.TOOLS.filter((t) => t.category === target.category).length));
    await page.goBack();
    await page.waitForURL(new RegExp(`/tools/${target.slug}$`));
    check("브라우저 뒤로 가기로 도구 페이지에 돌아옴", (await page.locator("h1").innerText()).includes(target.title));

    // 휴대폰에서는 가운데 항목이 … 으로 줄고, 첫·마지막 링크는 남아야 해요
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${BASE}/tools/${target.slug}`, { waitUntil: "networkidle" });
    const mobile = await page.getByTestId("breadcrumb-bar").evaluate((bar) => {
      const lis = [...bar.querySelectorAll('[data-testid="breadcrumb"] > ol > li')];
      const mid = lis.filter((li) => li.querySelector("a") && li.getBoundingClientRect().width === 0);
      const first = lis[0].querySelector("a")?.getAttribute("href");
      const lastLink = [...lis].reverse().find((li) => li.querySelector("a"))?.querySelector("a")?.getAttribute("href");
      return { hiddenMiddle: mid.length, first, lastLink, ellipsis: bar.innerText.includes("…") };
    });
    check("휴대폰에서 가운데 항목은 숨고 … 표시", mobile.hiddenMiddle === 1 && mobile.ellipsis, JSON.stringify(mobile));
    check("휴대폰에서도 첫 항목 링크는 남음", mobile.first === "/tools");
    await page.setViewportSize({ width: 1280, height: 900 });

    // ── 이전·다음 도구 이동 ──
    await page.goto(`${BASE}/tools/${target.slug}`, { waitUntil: "networkidle" });
    const inCat = T.TOOLS.filter((t) => t.category === target.category);
    const idx = inCat.findIndex((t) => t.slug === target.slug);
    const sibling = page.getByTestId("sibling-nav");
    check("이전·다음 이동 줄이 있음", (await sibling.count()) === 1);
    check("분야 전체 보기 링크", (await sibling.getByRole("link", { name: target.category }).getAttribute("href")) === `/tools?cat=${encodeURIComponent(target.category)}`);
    const navSlugs = await sibling.locator("a[href^='/tools/']").evaluateAll((as) => as.map((a) => a.getAttribute("href").replace("/tools/", "")));
    const expected = [inCat[idx - 1]?.slug, inCat[idx + 1]?.slug].filter(Boolean);
    check("이전·다음 도구가 같은 분야 안에서 이어짐", JSON.stringify(navSlugs.sort()) === JSON.stringify(expected.sort()), `${navSlugs} vs ${expected}`);
    if (inCat.length > 1) {
      const goNext = idx + 1 < inCat.length;
      // 이름은 부분 일치 문자열로 비교한다. 제목에 괄호가 들어 가면 정규식이 깨져서 못 찾아요.
      const link = goNext ? sibling.getByRole("link", { name: inCat[idx + 1].title }) : sibling.getByRole("link", { name: inCat[idx - 1].title });
      const wantSlug = goNext ? inCat[idx + 1].slug : inCat[idx - 1].slug;
      await link.click();
      await page.waitForFunction((slug) => location.pathname === "/tools/" + slug, wantSlug, { timeout: 8000 }).catch(() => {});
      const landed = page.url().split("/tools/")[1];
      check("이전·다음 링크로 실제 이동", landed === wantSlug, `기대 ${wantSlug}, 실제 ${landed}`);
      check("이동한 뒤에도 작업경로가 같은 자리에 있음", (await page.getByTestId("breadcrumb-bar").count()) === 1 && (await page.locator('[data-testid="breadcrumb-bar"] [aria-current="page"]').innerText()).includes(inCat.find((t) => t.slug === landed).title));
    }

    // ── 이전 단계 버튼 · 맨 위로 ──
    await page.goto(`${BASE}/tools/${target.slug}`, { waitUntil: "networkidle" });
    const back = page.getByRole("link", { name: /도구 사전으로/ });
    check("「도구 사전으로」 버튼", (await back.count()) === 1 && (await back.getAttribute("href")) === "/tools");
    check("「이 분야 전체 보기」 버튼", (await page.getByRole("link", { name: /이 분야 전체 보기/ }).count()) === 1);
    const toTop = page.getByRole("button", { name: "맨 위로 가기" });
    check("맨 위로 버튼 존재", (await toTop.count()) === 1);
    check("처음에는 맨 위로 버튼이 숨겨져 있음", await toTop.evaluate((b) => b.className.includes("opacity-0")));
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(250);
    check("내리면 맨 위로 버튼이 보임", !(await toTop.evaluate((b) => b.className.includes("opacity-0"))));
    await toTop.click();
    await page.waitForFunction(() => window.scrollY < 60, null, { timeout: 3000 });
    check("누르면 맨 위로 올라감", (await page.evaluate(() => window.scrollY)) < 60);

    // ── 스크롤해도 작업경로가 고정되는지 ──
    const stickyCheck = async (label) => {
      const bar = page.getByTestId("breadcrumb-bar");
      const style = await bar.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { position: cs.position, top: cs.top, z: cs.zIndex };
      });
      check(`${label}: sticky + top:0 + 위에 떠 있음(z)`, style.position === "sticky" && style.top === "0px" && Number(style.z) >= 10, JSON.stringify(style));

      await page.evaluate(() => window.scrollTo(0, 1400));
      await page.waitForTimeout(250);
      const scrolled = await page.evaluate(() => window.scrollY);
      check(`${label}: 실제로 스크롤됨`, scrolled > 1000, String(scrolled));
      const box = await bar.boundingBox();
      check(`${label}: 스크롤해도 화면 맨 위에 고정`, box.y >= -1 && box.y <= 2, `y=${box.y}`);
      check(`${label}: 고정된 동안에도 보임`, await bar.isVisible());
      const onTop = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="breadcrumb-bar"]');
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return el.contains(hit);
      });
      check(`${label}: 다른 내용이 작업경로 위로 덮지 않음`, onTop);
      check(`${label}: 맨 위에 붙으면 그림자(data-stuck)`, (await bar.getAttribute("data-stuck")) === "true");
      // 고정된 상태에서도 링크를 누를 수 있어야 해요
      await bar.locator("a").first().click();
      await page.waitForTimeout(300);
      check(`${label}: 고정된 상태에서 링크도 작동`, page.url().includes("/tools"));
    };

    await page.goto(`${BASE}/tools/${target.slug}`, { waitUntil: "networkidle" });
    await stickyCheck("도구 상세");
    await page.goto(`${BASE}/tools`, { waitUntil: "networkidle" });
    await stickyCheck("카탈로그");

    // 휴대폰에서도 고정 + 가로 넘침 없음
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`${BASE}/tools/${target.slug}`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(250);
    const mob = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="breadcrumb-bar"]');
      const r = el.getBoundingClientRect();
      return { y: Math.round(r.y), sw: document.documentElement.scrollWidth, iw: window.innerWidth };
    });
    check("휴대폰에서도 스크롤 시 고정", mob.y >= -1 && mob.y <= 2, JSON.stringify(mob));
    check("휴대폰에서 가로 넘침 없음", mob.sw <= mob.iw + 1, `${mob.sw}>${mob.iw}`);

    check("작업경로·이동 기능 오류 없음", errors.length === 0, errors.slice(0, 2).join(" | "));
    await context.close();
  });

  await browser.close();
  console.log(`\n${failures === 0 ? "✅ 모든 섹션 통과" : `❌ 실패 ${failures}건`} (총 ${checks}개 검사)`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
