import { TOOLS } from "./ready";
import { PLANNED_TOOLS } from "./planned";
import type { Tool } from "./types";

export * from "./types";
export { CATEGORIES, ROLES, SHAPES } from "./taxonomy";
export type { Category } from "./taxonomy";
export { COMMON_RULES, HOW_TO_OPEN, buildPrompt } from "./prompt";
export { TOOLS, PLANNED_TOOLS };

/** '업무효율 100' — 완성·준비 중을 합친 카탈로그 목표 수 */
export const CATALOG_GOAL = 100;

/** 가장 최근에 추가한 몇 개를 NEW 로 표시할지 */
export const NEW_TOOL_LIMIT = 2;

export function getTool(slug: string): Tool | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function featuredTools(): Tool[] {
  return TOOLS.filter((t) => t.featured).sort((a, b) => (a.featured ?? 99) - (b.featured ?? 99));
}

/** 가장 최근에 추가된 도구의 slug 집합 (카탈로그 NEW 배지 기준) */
export function newToolSlugs(limit: number = NEW_TOOL_LIMIT): Set<string> {
  return new Set(
    TOOLS.filter((t) => typeof t.addedAt === "number")
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
      .slice(0, limit)
      .map((t) => t.slug),
  );
}

export function catalogCounts() {
  const ready = TOOLS.length;
  const planned = PLANNED_TOOLS.length;
  return { ready, planned, total: ready + planned, goal: CATALOG_GOAL };
}
