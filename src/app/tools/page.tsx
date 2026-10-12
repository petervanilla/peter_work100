import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/BrandMark";
import { FilterBar } from "@/components/catalog/FilterBar";
import { BackToTop } from "@/components/BackToTop";
import { SiteFooter, SiteHeaderWithBreadcrumb } from "@/components/SiteChrome";
import { NewBadge, PlannedCard, ToolCard } from "@/components/ToolCard";
import {
  catalogProgress,
  filterCatalog,
  isFiltered,
  parseQuery,
  type RawQuery,
} from "@/lib/catalog";
import { countOf, getCopyCounts } from "@/lib/copy-counts";
import { CATEGORIES, TOOLS, featuredTools, newToolSlugs } from "@/lib/tools";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "업무앱 · 업무효율 100 — 바로 쓰는 무료 업무 도구",
  description:
    "회의·보고·정산부터 매장 운영, 병원, 학생용까지. 설치 없이 바로 쓰고 코드와 AI 프롬프트를 복사해 우리 팀에 맞게 고치세요.",
};

const RANKING_THRESHOLD = 30;

const HOW_TO_USE = [
  {
    step: "1",
    title: "열어서 바로 써요",
    description:
      "설치도 로그인도 없어요. 화면에 그대로 켜 두고 쓰면 됩니다. 입력한 내용은 내 브라우저에만 남아요.",
  },
  {
    step: "2",
    title: "마음에 들면 코드를 복사",
    description:
      "「코드 복사」를 누르고 메모장에 붙여 넣은 뒤 .html로 저장하면, 인터넷 없이도 도는 내 도구가 돼요.",
  },
  {
    step: "3",
    title: "AI에게 우리 팀에 맞게 고쳐 달라고 하기",
    description:
      "「AI 프롬프트 복사」를 눌러 AI에 붙여 넣으면, 검토표 화면이 열리고 질문에 답하는 것만으로 내 상황에 맞는 도구가 완성돼요.",
  },
];

const H2 = "text-lg font-black tracking-tight text-slate-900 dark:text-slate-100";
const PANEL =
  "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<RawQuery>;
}) {
  const query = parseQuery(await searchParams);
  const filtered = isFiltered(query);
  const progress = catalogProgress();
  const counts = await getCopyCounts();
  const promptOf = (slug: string) => countOf(counts, slug).prompt;

  const { ready, planned } = filterCatalog(query);
  const readySlugs = new Set(ready.map((t) => t.slug));
  const newSlugs = newToolSlugs();

  const totalPromptCopies = TOOLS.reduce((sum, t) => sum + promptOf(t.slug), 0);
  const isRanking = totalPromptCopies >= RANKING_THRESHOLD;

  const featured = featuredTools().filter((t) => readySlugs.has(t.slug));
  const featuredShown = isRanking
    ? [...featured].sort((a, b) => promptOf(b.slug) - promptOf(a.slug))
    : featured;
  const newTools = TOOLS.filter((t) => newSlugs.has(t.slug) && readySlugs.has(t.slug)).sort(
    (a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0),
  );

  return (
    <div className="min-h-screen">
      <SiteHeaderWithBreadcrumb
        tagline="바로 쓰는 무료 업무 도구 · 복사해서 우리 팀에 맞게"
        label="도구 주문 사전"
        trailing={
          <Link
            href="/tools#howto"
            className="hidden rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:block"
          >
            이렇게 사용하세요
          </Link>
        }
        crumbs={[
          { label: "업무앱", href: "/tools" },
          { label: "전체 도구" },
        ]}
      />

      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-6xl px-5 py-7">
          <h1 className="text-[clamp(1.9rem,5vw,2.8rem)] font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            업무효율{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
              100
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            설치 없이 바로 쓰고, 코드와 AI 프롬프트를 복사해 우리 팀에 맞게 고치는 업무 도구
            모음이에요. 회의·보고·정산부터 매장 운영, 병원, 학생용까지 12개 분야를 채워 가고
            있어요.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span
              data-testid="stat-ready"
              className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              지금 바로 쓰기 <b data-testid="stat-ready-value">{progress.ready}</b>
            </span>
            <span
              data-testid="stat-planned"
              className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              준비 중 <b data-testid="stat-planned-value">{progress.planned}</b>
            </span>
            <span
              data-testid="stat-total"
              className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
            >
              전체 <b data-testid="stat-total-value">{progress.total}</b> / 목표 {progress.goal}
            </span>
          </div>
          <div
            className="mt-2.5 h-2 max-w-md overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
            role="progressbar"
            aria-label="완성된 도구"
            aria-valuemin={0}
            aria-valuemax={progress.goal}
            aria-valuenow={progress.ready}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] font-bold text-slate-400">
            완성 {progress.ready}/{progress.goal} · 준비 중인 도구는 완성되는 대로 열려요
          </p>

          <FilterBar query={query} />

          <p
            data-testid="visible-count"
            className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            찾기 · 지금 보이는 도구{" "}
            <span data-testid="visible-total">{ready.length + planned.length}</span>개
            <span className="ml-1 font-semibold text-slate-400">
              (바로 쓰기 <span data-testid="visible-ready">{ready.length}</span> · 준비 중{" "}
              <span data-testid="visible-planned">{planned.length}</span>)
            </span>
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {featuredShown.length > 0 ? (
          <section data-testid="featured-section" className="mb-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className={H2}>{isRanking ? "🏆 많이 쓰는 순위" : "✨ 처음이라면 이것부터"}</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {isRanking
                    ? "AI 프롬프트를 가장 많이 복사한 도구 순이에요."
                    : `추천 · AI 프롬프트 복사가 ${RANKING_THRESHOLD}번 모이면 «많이 쓰는 순위»로 바뀌어요`}
                </p>
              </div>
              {!isRanking ? (
                <div className="w-44">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                      style={{ width: `${Math.min(100, (totalPromptCopies / RANKING_THRESHOLD) * 100)}%` }}
                    />
                  </div>
                  <p data-testid="ranking-progress" className="mt-1 text-right text-[11px] font-bold text-slate-400">
                    {totalPromptCopies}/{RANKING_THRESHOLD} · {RANKING_THRESHOLD - totalPromptCopies}번 더 모으면 순위가 열려요
                  </p>
                </div>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredShown.map((tool, i) => (
                <div key={tool.slug} className="relative">
                  <span className="absolute -left-2 -top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white shadow-md">
                    {isRanking ? i + 1 : tool.featured}
                  </span>
                  <ToolCard tool={tool} promptCopies={promptOf(tool.slug)} isNew={newSlugs.has(tool.slug)} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {newTools.length > 0 ? (
          <section data-testid="new-section" className="mb-10">
            <div className="mb-4">
              <h2 className={`flex items-center gap-2 ${H2}`}>
                <NewBadge />
                새로 추가된 도구
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                가장 최근에 추가한 {newTools.length}개예요. 바로 열어 보고 코드도 가져가세요.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {newTools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} promptCopies={promptOf(tool.slug)} isNew />
              ))}
            </div>
          </section>
        ) : null}

        {CATEGORIES.map((category) => {
          const readyInCat = ready.filter((t) => t.category === category.id);
          const plannedInCat = planned.filter((t) => t.category === category.id);
          if (readyInCat.length === 0 && plannedInCat.length === 0) return null;
          return (
            <section
              key={category.id}
              data-testid="category-section"
              data-category={category.id}
              className="mb-10"
            >
              <div className="mb-4 flex flex-wrap items-baseline gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
                <h2 className={H2}>{category.name}</h2>
                <span className="text-xs text-slate-400">{category.tagline}</span>
                <span className="ml-auto flex gap-1.5 text-[11px] font-bold">
                  {readyInCat.length > 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                      바로 쓰기 {readyInCat.length}개
                    </span>
                  ) : null}
                  {plannedInCat.length > 0 ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      준비 중 {plannedInCat.length}개
                    </span>
                  ) : null}
                </span>
              </div>

              {readyInCat.length > 0 ? (
                <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {readyInCat.map((tool) => (
                    <ToolCard
                      key={tool.slug}
                      tool={tool}
                      promptCopies={promptOf(tool.slug)}
                      isNew={newSlugs.has(tool.slug)}
                    />
                  ))}
                </div>
              ) : null}

              {plannedInCat.length > 0 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <p className="mb-2 text-xs font-black text-slate-400">
                    {readyInCat.length === 0
                      ? "아직 완성된 도구가 없어요 · 곧 나올 도구"
                      : "곧 나올 도구"}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {plannedInCat.map((tool) => (
                      <PlannedCard key={tool.title} tool={tool} />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}

        {filtered && ready.length + planned.length === 0 ? (
          <div
            data-testid="empty-state"
            className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-3xl" aria-hidden="true">🔍</p>
            <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">조건에 맞는 도구가 없어요</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">검색어나 필터를 바꿔 보세요.</p>
            <Link
              href="/tools"
              className="mt-4 inline-block rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900"
            >
              전체 보기
            </Link>
          </div>
        ) : null}

        <section id="howto" className="mt-12 scroll-mt-6">
          <h2 className={H2}>🤖 이렇게 사용하세요 — 복사하고, AI와 함께 고치고</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            이 사전의 도구는 「그대로 쓰는 것」에서 끝나지 않아요. 코드를 복사하고 AI에게 물으면
            우리 팀에 꼭 맞는 도구로 바뀝니다.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {HOW_TO_USE.map((item) => (
              <div key={item.step} className={`${PANEL} p-5`}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-black text-white">
                  {item.step}
                </span>
                <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/10">
            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
              AI와 친해지는 가장 쉬운 방법, 「이 도구를 우리 상황으로 바꿔 줘」라고 묻는 거예요.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-indigo-700/80 dark:text-indigo-200/80">
              각 도구 페이지의 「AI 프롬프트 복사」를 누르면, AI가 검토표 화면을 열고 우리 팀에 맞는
              질문을 던져 줘요. 답을 고르고 [결정 복사하기]를 눌러 다시 붙여 넣으면 완성본이
              나옵니다. 코딩을 몰라도 괜찮아요 — 고르기만 하면 되게 만들어 뒀으니까요.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark size="sm" />
            <span className="text-xs font-bold text-slate-400">업무 도구 주문 사전</span>
          </div>
          <p className="text-xs text-slate-400">
            모든 도구는 HTML 파일 하나 · 설치·로그인 없이 · 인터넷 없이도 작동
          </p>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          입력한 내용은 브라우저에만 저장되고 어디로도 전송되지 않아요. 도구는 자유롭게 복사하고
          고쳐 쓰세요.
        </p>
      </SiteFooter>
    </div>
  );
}
