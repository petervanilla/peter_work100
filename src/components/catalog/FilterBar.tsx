import Link from "next/link";
import { hrefFor, type CatalogQuery } from "@/lib/catalog";
import { CATEGORIES, ROLES, SHAPES } from "@/lib/tools";

function Chip({
  href,
  active,
  group,
  children,
}: {
  href: string;
  active: boolean;
  group: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-testid="filter-chip"
      data-group={group}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "border-transparent bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </Link>
  );
}

function ChipRow({
  label,
  group,
  query,
  field,
  options,
}: {
  label: string;
  group: string;
  query: CatalogQuery;
  field: "cat" | "role" | "shape";
  options: readonly { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-black text-slate-400">{label}</span>
      <Chip href={hrefFor(query, { [field]: "" })} active={!query[field]} group={group}>
        전체
      </Chip>
      {options.map((o) => (
        <Chip
          key={o.value}
          href={hrefFor(query, { [field]: query[field] === o.value ? "" : o.value })}
          active={query[field] === o.value}
          group={group}
        >
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

export function FilterBar({ query }: { query: CatalogQuery }) {
  const same = (list: readonly string[]) => list.map((v) => ({ value: v, label: v }));
  return (
    <>
      <form action="/tools" method="get" role="search" className="mt-4 flex gap-2">
        {query.cat ? <input type="hidden" name="cat" value={query.cat} /> : null}
        {query.role ? <input type="hidden" name="role" value={query.role} /> : null}
        {query.shape ? <input type="hidden" name="shape" value={query.shape} /> : null}
        <div className="relative flex-1">
          <span aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            🔍
          </span>
          <input
            type="search"
            name="q"
            aria-label="도구 검색"
            defaultValue={query.q}
            placeholder="도구 이름이나 상황을 검색해 보세요 (예: 회의, 마감, 견적, 알바)"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-500/30"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          찾기
        </button>
      </form>

      <div className="mt-4 space-y-2.5">
        <ChipRow label="업무 장면" group="cat" query={query} field="cat" options={CATEGORIES.map((c) => ({ value: c.id, label: c.name }))} />
        <ChipRow label="누가 쓰나" group="role" query={query} field="role" options={same(ROLES)} />
        <ChipRow label="도구 모양" group="shape" query={query} field="shape" options={same(SHAPES)} />
      </div>
    </>
  );
}
