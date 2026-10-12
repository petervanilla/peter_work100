import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** 도구별 코드·프롬프트 복사 횟수 (카탈로그 "많이 쓰는 순위" 집계용) */
export const toolCopyCounts = pgTable("tool_copy_counts", {
  slug: text("slug").primaryKey(),
  codeCopies: integer("code_copies").notNull().default(0),
  promptCopies: integer("prompt_copies").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ToolCopyCount = typeof toolCopyCounts.$inferSelect;
