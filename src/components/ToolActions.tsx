"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const SECONDARY =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

export function ToolActions({
  slug,
  prompt,
  codeCopies,
  promptCopies,
}: {
  slug: string;
  prompt: string;
  codeCopies: number;
  promptCopies: number;
}) {
  const router = useRouter();
  const [toast, setToast] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [counts, setCounts] = useState({ code: codeCopies, prompt: promptCopies });

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(""), 2200);
  }

  async function countCopy(kind: "code" | "prompt") {
    setCounts((c) => ({ ...c, [kind]: c[kind] + 1 }));
    try {
      const res = await fetch("/api/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, kind }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounts({ code: data.code, prompt: data.prompt });
      }
    } catch {
      /* 복사 횟수는 통계일 뿐, 실패해도 조용히 넘어가요 */
    }
    router.refresh();
  }

  async function copyText(text: string, kind: "code" | "prompt", okMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(okMessage);
      await countCopy(kind);
    } catch {
      flash("복사가 막혀 있어요. 아래 코드를 직접 선택해 복사해 주세요.");
      if (kind === "code") {
        const res = await fetch(`/tools/${slug}.html`);
        setCode(await res.text());
      }
      setShowCode(true);
    }
  }

  async function copyCode() {
    try {
      const res = await fetch(`/tools/${slug}.html`);
      const text = await res.text();
      await copyText(text, "code", "코드가 복사됐어요! 메모장에 저장해 .html로 만드세요.");
    } catch {
      flash("코드를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  async function toggleCode() {
    if (showCode) {
      setShowCode(false);
      return;
    }
    if (code === null) {
      try {
        const res = await fetch(`/tools/${slug}.html`);
        setCode(await res.text());
      } catch {
        setCode("// 코드를 불러오지 못했어요.");
      }
    }
    setShowCode(true);
  }

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] dark:shadow-none"
        >
          📋 코드 복사
          <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[11px] font-semibold">
            {counts.code}
          </span>
        </button>
        <button type="button" onClick={toggleCode} className={SECONDARY}>
          {showCode ? "코드 접기" : "🔍 코드 보기"}
        </button>
        <button
          type="button"
          onClick={() => copyText(prompt, "prompt", "AI 프롬프트가 복사됐어요! AI에 붙여 넣어 보세요.")}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
        >
          🤖 AI 프롬프트 복사
          <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] font-semibold dark:bg-slate-900/60">
            {counts.prompt}
          </span>
        </button>
        <Link
          href={`/tools/${slug}.html`}
          target="_blank"
          rel="noopener noreferrer"
          className={SECONDARY}
        >
          ↗ 새 탭에서 열기
        </Link>
      </div>

      {toast ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          {toast}
        </p>
      ) : null}

      {showCode ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              {slug}.html · HTML·CSS·JS가 든 파일 하나 (그대로 저장하면 돼요)
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200 transition hover:bg-white/20"
            >
              이 코드 복사
            </button>
          </div>
          <pre className="max-h-[420px] overflow-auto text-[11px] leading-relaxed text-slate-200">
            <code>{code ?? "불러오는 중…"}</code>
          </pre>
        </div>
      ) : null}
    </div>
  );
}
