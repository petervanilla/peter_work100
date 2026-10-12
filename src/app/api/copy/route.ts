import { db } from "@/db";
import { toolCopyCounts } from "@/db/schema";
import { getCopyCounts } from "@/lib/copy-counts";
import { getTool } from "@/lib/tools";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const KINDS = ["code", "prompt"] as const;
type Kind = (typeof KINDS)[number];

const isKind = (value: unknown): value is Kind =>
  typeof value === "string" && (KINDS as readonly string[]).includes(value);

export async function GET() {
  const counts = await getCopyCounts();
  return Response.json({ counts: Object.fromEntries(counts) });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON 형식이 아니에요." }, { status: 400 });
  }

  const { slug, kind } = (body ?? {}) as { slug?: unknown; kind?: unknown };
  if (typeof slug !== "string" || !isKind(kind)) {
    return Response.json({ error: "slug(문자열)과 kind(code | prompt)가 필요해요." }, { status: 400 });
  }
  // 목록에 없는 도구는 집계하지 않아요. (임의 문자열로 DB가 채워지는 것을 막음)
  if (!getTool(slug)) {
    return Response.json({ error: "알 수 없는 도구예요." }, { status: 404 });
  }

  const isCode = kind === "code";
  try {
    const [row] = await db
      .insert(toolCopyCounts)
      .values({ slug, codeCopies: isCode ? 1 : 0, promptCopies: isCode ? 0 : 1 })
      .onConflictDoUpdate({
        target: toolCopyCounts.slug,
        set: isCode
          ? { codeCopies: sql`${toolCopyCounts.codeCopies} + 1`, updatedAt: new Date() }
          : { promptCopies: sql`${toolCopyCounts.promptCopies} + 1`, updatedAt: new Date() },
      })
      .returning({ code: toolCopyCounts.codeCopies, prompt: toolCopyCounts.promptCopies });

    return Response.json({ slug, code: row.code, prompt: row.prompt });
  } catch (error) {
    console.error("[api/copy] 저장 실패:", error);
    return Response.json({ error: "복사 횟수를 저장하지 못했어요." }, { status: 500 });
  }
}
