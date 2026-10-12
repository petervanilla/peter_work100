/**
 * 「준비 중 66개」 완성 가능 경로 분석
 * 실행: node scripts/analyze-planned.cjs          (콘솔 요약)
 *       node scripts/analyze-planned.cjs --json    (상세 JSON)
 *
 * 각 준비 중 도구에 대해 완성 방식을 분류합니다.
 *   A 재사용 — 같은 분류에 '같은 모양'의 완성 도구가 있어 베낄 수 있음 (키·표·인쇄 등)
 *   B 이식   — 다른 분류에 같은 모양 완성 도구가 있어 화면은 그대로, 데이터만 바꿔야 함
 *   C 신규   — 그 모양의 완성본이 하나도 없어 새 설계가 필요 (사진 기록·엑셀 연결 등)
 */
const { loadTs } = require("./lib/load-ts.cjs");

const T = loadTs("src/lib/tools/index.ts");
const ready = T.TOOLS;
const planned = T.PLANNED_TOOLS;

const norm = (s) => s.replace(/[\s·()\-→:「」]/g, "").toLowerCase();

/* ── 1. 모양(shape)별 완성 커버리지 ── */
const shapeReady = new Map(); // shape → [ready title...]
for (const t of ready) for (const s of t.shape) {
  if (!shapeReady.has(s)) shapeReady.set(s, []);
  shapeReady.get(s).push(t.title);
}
const shapePlanned = new Map();
for (const t of planned) for (const s of t.shape) {
  if (!shapePlanned.has(s)) shapePlanned.set(s, []);
  shapePlanned.get(s).push(t.title);
}

/* ── 2. 각 준비 중 도구의 최적 베이스(베낄 완성 도구) ── */
const baseFor = (t) => {
  let best = null;
  let bestScore = 0;
  for (const r of ready) {
    const sameShape = r.shape.filter((s) => t.shape.includes(s)).length;
    if (sameShape === 0) continue;
    const sameCat = r.category === t.category ? 1 : 0;
    const score = sameShape * 10 + sameCat;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return { base: best, score: bestScore };
};

const rows = planned.map((t) => {
  const { base, score } = baseFor(t);
  const sameCat = base && base.category === t.category;
  const path = !base ? "C 신규 설계" : sameCat ? "A 재사용" : "B 이식";
  // 제목이 완성 도구와 얼마나 닮았는지 (0~1)
  let near = null;
  for (const r of ready) {
    const a = norm(t.title), b = norm(r.title);
    if (a === b) { near = r.title; break; }
    const common = [...a].filter((c) => b.includes(c)).length;
    const ratio = common / Math.max(a.length, b.length);
    if (ratio >= 0.62) { near = `${r.title} (${Math.round(ratio * 100)}%)`; break; }
  }
  return {
    title: t.title,
    category: t.category,
    shape: t.shape.join("+"),
    wave: t.wave ?? 0,
    path,
    base: base ? base.title : "—",
    baseTitle: base ? base.title : null,
    baseSlug: base ? base.slug : null,
    near,
    score,
  };
});

/* ── 3. 집계 ── */
const byPath = rows.reduce((m, r) => (m[r.path] = (m[r.path] || 0) + 1, m), {});
const byWave = rows.reduce((m, r) => (m["wave" + r.wave] = (m["wave" + r.wave] || 0) + 1, m), {});
const byCat = {};
for (const c of T.CATEGORIES) byCat[c.name] = { ready: 0, planned: 0, wave1: 0 };
for (const t of ready) if (byCat[t.category]) byCat[t.category].ready++;
for (const p of planned) {
  if (!byCat[p.category]) byCat[p.category] = { ready: 0, planned: 0, wave1: 0 };
  byCat[p.category].planned++;
  if (p.wave === 1) byCat[p.category].wave1++;
}
const shapeInfo = [...new Set([...shapeReady.keys(), ...shapePlanned.keys()])].map((s) => ({
  shape: s,
  ready: (shapeReady.get(s) || []).length,
  planned: (shapePlanned.get(s) || []).length,
})).sort((a, b) => b.planned - a.planned);

const wave1 = rows.filter((r) => r.wave === 1);
const nearHits = rows.filter((r) => r.near);

const result = {
  counts: { ready: ready.length, planned: planned.length, total: ready.length + planned.length },
  byPath,
  byWave,
  byCat,
  shapeInfo,
  wave1,
  nearHits,
  rows,
};

if (require.main === module && process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else if (require.main === module) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`=== 준비 중 ${planned.length}개 완성 경로 분석 (완성 ${ready.length}개 기준) ===`);
  console.log("\n[경로별]");
  for (const [k, v] of Object.entries(byPath)) console.log(`  ${pad(k, 14)} ${v}개`);
  console.log("\n[모양(shape)별 — 완성본 없는 모양이 신규 설계 부담]");
  for (const s of shapeInfo)
    console.log(`  ${pad(s.shape, 12)} 완성 ${String(s.ready).padStart(2)}개 · 준비 중 ${String(s.planned).padStart(2)}개${s.ready === 0 ? "  ← 템플릿 없음" : ""}`);
  console.log("\n[분류별 — 완성 비율이 낮은 곳이 불균형]");
  for (const [k, v] of Object.entries(byCat)) {
    const pct = v.ready + v.planned ? Math.round((v.ready / (v.ready + v.planned)) * 100) : 0;
    console.log(`  ${pad(k, 12)} 완성 ${String(v.ready).padStart(2)} / ${String(v.ready + v.planned).padStart(2)} (${String(pct).padStart(3)}%) · 다음 제작 ${v.wave1}개`);
  }
  console.log("\n[다음 제작(wave 1)]");
  console.log(`  ${wave1.length}개`);
  console.log("\n[제목이 완성 도구와 닮은 것 — 기능 중복 재검토 후보]");
  if (!nearHits.length) console.log("  없음");
  for (const r of nearHits) console.log(`  · ${r.title}  ↔  ${r.near}`);
  console.log("\n[도구별 베이스 매핑]");
  console.log(`  ${pad("분류", 12)}${pad("제목", 34)}${pad("경로", 12)}베이스`);
  for (const r of rows) console.log(`  ${pad(r.category, 12)}${pad(r.title, 34)}${pad(r.path, 12)}${r.base}`);
}

module.exports = result;
