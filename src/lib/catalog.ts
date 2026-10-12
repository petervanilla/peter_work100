import {
  CATEGORIES,
  PLANNED_TOOLS,
  ROLES,
  SHAPES,
  TOOLS,
  catalogCounts,
  type PlannedTool,
  type Tool,
} from "@/lib/tools";

/** 카탈로그 검색·필터 조건 (URL 쿼리와 1:1) */
export type CatalogQuery = {
  q: string;
  cat: string;
  role: string;
  shape: string;
};

export type RawQuery = Partial<Record<keyof CatalogQuery, string | string[] | undefined>>;

const firstValue = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? "";

/** 알 수 없는 값은 버립니다. (?cat=없는값 이어도 빈 화면이 되지 않게) */
function allowed(value: string, options: readonly string[]): string {
  const v = value.trim();
  return v && options.includes(v) ? v : "";
}

export function parseQuery(raw: RawQuery): CatalogQuery {
  return {
    q: firstValue(raw.q).trim().slice(0, 60),
    cat: allowed(firstValue(raw.cat), CATEGORIES.map((c) => c.id)),
    role: allowed(firstValue(raw.role), ROLES),
    shape: allowed(firstValue(raw.shape), SHAPES),
  };
}

export function isFiltered(query: CatalogQuery): boolean {
  return Boolean(query.q || query.cat || query.role || query.shape);
}

type Listed = Tool | PlannedTool;

export function matchesQuery(tool: Listed, query: CatalogQuery): boolean {
  if (query.cat && tool.category !== query.cat) return false;
  if (query.role && !tool.who.includes(query.role)) return false;
  if (query.shape && !tool.shape.includes(query.shape)) return false;
  if (query.q) {
    const summary = "summary" in tool ? tool.summary : "";
    const haystack = [tool.title, tool.category, ...tool.who, ...tool.shape, summary]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(query.q.toLowerCase())) return false;
  }
  return true;
}

export function filterCatalog(query: CatalogQuery): { ready: Tool[]; planned: PlannedTool[] } {
  return {
    ready: TOOLS.filter((t) => matchesQuery(t, query)),
    planned: PLANNED_TOOLS.filter((t) => matchesQuery(t, query)),
  };
}

/** 현재 조건에서 일부만 바꾼 /tools 링크 */
export function hrefFor(query: CatalogQuery, override: Partial<CatalogQuery>): string {
  const next = { ...query, ...override };
  const params = new URLSearchParams();
  if (next.cat) params.set("cat", next.cat);
  if (next.role) params.set("role", next.role);
  if (next.shape) params.set("shape", next.shape);
  if (next.q) params.set("q", next.q);
  const qs = params.toString();
  return qs ? `/tools?${qs}` : "/tools";
}

export function catalogProgress() {
  const counts = catalogCounts();
  return { ...counts, percent: Math.round((counts.ready / counts.goal) * 100) };
}
