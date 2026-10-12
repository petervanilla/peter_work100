import Link from "next/link";
import { BackToTop } from "@/components/BackToTop";
import type { Tool } from "@/lib/tools";

/**
 * 같은 분야 안에서 이전·다음 도구로 바로 넘어가는 길.
 * 「관련 도구」 목록을 뒤로 가지 않아도 양옆으로 훑어볼 수 있어요.
 */
export function SiblingNav({
  category,
  categoryHref,
  prev,
  next,
  siblingCount,
}: {
  category: string;
  categoryHref: string;
  prev?: Tool;
  next?: Tool;
  siblingCount: number;
}) {
  const card =
    "group flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-indigo-500/50";

  return (
    <nav
      aria-label="같은 분야의 다른 도구"
      data-testid="sibling-nav"
      className="mt-10 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch"
    >
      {prev ? (
        <Link href={`/tools/${prev.slug}`} className={card}>
          <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-400">
            <span aria-hidden="true">←</span> 이전 도구
          </span>
          <span className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" aria-hidden="true" />
      )}

      <Link
        href={categoryHref}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-xs font-bold text-slate-500 transition hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300"
      >
        <span aria-hidden="true">☰</span>
        {category} 전체 보기
        <span className="text-slate-400">({siblingCount})</span>
      </Link>

      {next ? (
        <Link href={`/tools/${next.slug}`} className={`${card} items-end text-right`}>
          <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-400">
            다음 도구 <span aria-hidden="true">→</span>
          </span>
          <span className="truncate text-sm font-bold text-slate-800 group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
            {next.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" aria-hidden="true" />
      )}
    </nav>
  );
}

/** 이전 단계로 돌아가는 큰 버튼 두 개 (카탈로그로 · 같은 분야로) */
export function StepBackLinks({
  categoryHref,
  catalogHref = "/tools",
}: {
  categoryHref: string;
  catalogHref?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500/60 dark:hover:text-indigo-300";
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Link href={catalogHref} className={base}>
        <span aria-hidden="true">←</span> 도구 사전으로
      </Link>
      <Link href={categoryHref} className={base}>
        <span aria-hidden="true">☰</span> 이 분야 전체 보기
      </Link>
      <BackToTop />
    </div>
  );
}
