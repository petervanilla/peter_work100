"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * 카드 우하단 '크게 보기' 버튼 + 확대 미리보기 모달.
 * 카탈로그에는 카드가 수십 개라, 모달 이미지는 열었을 때만 불러옵니다.
 */
export function ToolPreview({
  slug,
  title,
  summary,
}: {
  slug: string;
  title: string;
  summary: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={`${title} 화면 크게 보기`}
        onClick={() => setOpen(true)}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-white hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200 dark:shadow-black/30 dark:hover:bg-slate-900 dark:hover:text-indigo-300"
      >
        <span aria-hidden="true">⤢</span>
        크게 보기
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`${title} 화면 미리보기`}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="m-auto max-h-[94dvh] w-[min(94vw,1120px)] max-w-none overflow-y-auto rounded-3xl border border-white/20 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {open ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">{title}</p>
                <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
                  실제 도구 화면 · 예시 데이터를 담은 미리보기
                </p>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                aria-label="미리보기 닫기"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-lg font-medium text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-100 p-2 dark:bg-slate-950 sm:p-4">
              <img
                src={`/tools/previews/${slug}.png`}
                alt={`${title}의 실제 도구 화면. ${summary}`}
                width={878}
                height={560}
                className="mx-auto block h-auto max-h-[70dvh] w-full rounded-xl bg-white object-contain shadow-sm dark:bg-slate-900 dark:brightness-90 sm:rounded-2xl"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
              <p className="max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">{summary}</p>
              <Link
                href={`/tools/${slug}`}
                onClick={() => setOpen(false)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-200 transition hover:from-indigo-500 hover:to-violet-500 dark:shadow-none"
              >
                바로 써 보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        ) : null}
      </dialog>
    </>
  );
}
