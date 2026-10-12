import { db } from "@/db";
import { toolCopyCounts } from "@/db/schema";

export type CopyCount = { code: number; prompt: number };

const EMPTY: CopyCount = { code: 0, prompt: 0 };

/**
 * 도구별 복사 횟수. DB가 잠시 응답하지 않아도 카탈로그가 죽지 않도록
 * 실패하면 빈 집계로 대체합니다. (복사 횟수는 부가 정보이므로)
 */
export async function getCopyCounts(): Promise<Map<string, CopyCount>> {
  try {
    const rows = await db.select().from(toolCopyCounts);
    return new Map(rows.map((r) => [r.slug, { code: r.codeCopies, prompt: r.promptCopies }]));
  } catch (error) {
    console.error("[copy-counts] 조회 실패:", error);
    return new Map();
  }
}

export function countOf(counts: Map<string, CopyCount>, slug: string): CopyCount {
  return counts.get(slug) ?? EMPTY;
}
