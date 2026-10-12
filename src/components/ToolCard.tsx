import Link from "next/link";
import type { PlannedTool, Tool } from "@/lib/tools";
import { ToolPreview } from "@/components/ToolPreview";

type Tone = "slate" | "indigo" | "violet" | "amber";

const TONES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

export function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function NewBadge() {
  return (
    <span
      data-testid="new-badge"
      className="shrink-0 rounded-full bg-gradient-to-r from-rose-600 to-orange-700 px-1.5 py-0.5 text-[10px] font-black leading-none tracking-wide text-white shadow-sm"
    >
      NEW
    </span>
  );
}

export function ToolCard({
  tool,
  promptCopies,
  isNew = false,
}: {
  tool: Tool;
  promptCopies: number;
  isNew?: boolean;
}) {
  return (
    <article
      data-testid="tool-card"
      data-slug={tool.slug}
      className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none dark:hover:border-indigo-500/50 dark:hover:shadow-none"
    >
      {/* 썸네일 위에는 아무 배지도 얹지 않아요. 화면이 가려지면 안 되니까요. */}
      <div
        data-testid="tool-thumb"
        className="relative aspect-[878/560] overflow-hidden border-b border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
      >
        <Link
          href={`/tools/${tool.slug}`}
          aria-label={`${tool.title} 도구 열기`}
          className="absolute inset-0 block overflow-hidden"
        >
          <img
            src={`/tools/previews/${tool.slug}.png`}
            alt={`${tool.title} 실제 화면 미리보기`}
            width={878}
            height={560}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.025] dark:brightness-90"
          />
        </Link>
        <ToolPreview slug={tool.slug} title={tool.title} summary={tool.summary} />
      </div>

      <Link
        href={`/tools/${tool.slug}`}
        className="block p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-1.5 text-base font-black tracking-tight text-slate-900 transition group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300">
            <span className="truncate">{tool.title}</span>
            {isNew ? <NewBadge /> : null}
          </h3>
          <span
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-sm text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-300"
          >
            →
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 min-h-9 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {tool.summary}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Tag tone="indigo">{tool.category}</Tag>
          {tool.who.slice(0, 2).map((w) => (
            <Tag key={w}>{w}</Tag>
          ))}
          {tool.shape.slice(0, 2).map((s) => (
            <Tag key={s} tone="violet">
              {s}
            </Tag>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-indigo-500 opacity-0 transition group-hover:opacity-100 dark:text-indigo-300">
            열어서 쓰기 · 코드 복사 · AI로 고치기 →
          </p>
          {promptCopies > 0 ? (
            <span className="shrink-0 text-[11px] font-bold text-slate-400">
              🤖 {promptCopies}회 복사
            </span>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

/** 아직 만들지 않은 도구. 눌러서 이동하는 링크가 아니라 '예고' 카드예요. */
export function PlannedCard({ tool }: { tool: PlannedTool }) {
  return (
    <div
      data-testid="planned-card"
      data-wave={tool.wave ?? ""}
      className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40"
    >
      <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">
        •
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
        {tool.title}
      </span>
      {tool.wave === 1 ? <Tag tone="amber">다음 제작</Tag> : null}
      <span className="hidden shrink-0 gap-1 sm:flex">
        {tool.who.slice(0, 1).map((w) => (
          <Tag key={w}>{w}</Tag>
        ))}
        {tool.shape.slice(0, 1).map((s) => (
          <Tag key={s} tone="violet">
            {s}
          </Tag>
        ))}
      </span>
    </div>
  );
}
