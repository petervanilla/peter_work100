import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeaderWithBreadcrumb } from "@/components/SiteChrome";
import { NewBadge } from "@/components/ToolCard";
import { ToolActions } from "@/components/ToolActions";
import { SiblingNav, StepBackLinks } from "@/components/tool/ToolNav";
import {
  ChangeTipsSection,
  PromptSection,
  RelatedSection,
  ToolFrame,
  ToolTags,
  UseCasesSection,
} from "@/components/tool/ToolSections";
import { countOf, getCopyCounts } from "@/lib/copy-counts";
import { TOOLS, buildPrompt, getTool, newToolSlugs } from "@/lib/tools";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const tool = getTool((await params).slug);
  return tool
    ? { title: `${tool.title} · 업무앱`, description: tool.summary }
    : { title: "도구를 찾을 수 없어요 · 업무앱" };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const counts = countOf(await getCopyCounts(), slug);
  const newSlugs = newToolSlugs();
  const related = TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug);
  const inCategory = TOOLS.filter((t) => t.category === tool.category);
  const currentIndex = inCategory.findIndex((t) => t.slug === tool.slug);
  const prevTool = currentIndex > 0 ? inCategory[currentIndex - 1] : undefined;
  const nextTool =
    currentIndex >= 0 && currentIndex < inCategory.length - 1
      ? inCategory[currentIndex + 1]
      : undefined;
  const categoryHref = `/tools?cat=${encodeURIComponent(tool.category)}`;

  return (
    <div className="min-h-screen">
      <SiteHeaderWithBreadcrumb
        width="max-w-5xl"
        tagline="업무 도구 주문 사전"
        trailing={
          <>
            <Link
              href="/tools"
              className="hidden items-center gap-1 text-xs font-bold text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-300 sm:flex"
            >
              <span aria-hidden="true">←</span> 전체 도구
            </Link>
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 md:inline-block">
              설치·로그인 없이 바로 써요
            </span>
          </>
        }
        crumbs={[
          { label: "업무앱", href: "/tools" },
          {
            label: tool.category,
            href: `/tools?cat=${encodeURIComponent(tool.category)}`,
          },
          { label: tool.title },
        ]}
      />

      <main className="mx-auto max-w-5xl px-5 py-7">
        <div className="mb-5">
          <ToolTags tool={tool} />
          <h1 className="mt-2.5 flex flex-wrap items-center gap-2 text-[clamp(1.5rem,4vw,2.1rem)] font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {tool.title}
            {newSlugs.has(tool.slug) ? <NewBadge /> : null}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {tool.summary}
          </p>
        </div>

        <ToolActions
          slug={tool.slug}
          prompt={buildPrompt(tool)}
          codeCopies={counts.code}
          promptCopies={counts.prompt}
        />
        <ToolFrame tool={tool} />
        <UseCasesSection tool={tool} />
        <ChangeTipsSection tool={tool} />
        <PromptSection tool={tool} prompt={buildPrompt(tool)} />
        <SiblingNav
          category={tool.category}
          categoryHref={categoryHref}
          prev={prevTool}
          next={nextTool}
          siblingCount={inCategory.length}
        />
        <div className="mt-8">
          <StepBackLinks categoryHref={categoryHref} />
        </div>
        <RelatedSection category={tool.category} tools={related} newSlugs={newSlugs} />
      </main>

      <SiteFooter width="max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← 도구 주문 사전으로
          </Link>
          <p className="text-xs text-slate-400">코드와 프롬프트는 자유롭게 복사하고 고쳐 쓰세요.</p>
        </div>
      </SiteFooter>
    </div>
  );
}
