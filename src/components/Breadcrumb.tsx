"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type Crumb = {
  label: string;
  /** 없으면 "현재 위치"로 표시해요 (마지막 항목은 보통 비워 둡니다) */
  href?: string;
};

function Separator() {
  return (
    <li
      aria-hidden="true"
      className="flex shrink-0 items-center px-0.5 text-slate-300 dark:text-slate-600"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </li>
  );
}

function CrumbBody({ crumb }: { crumb: Crumb }) {
  const shared = "flex min-w-0 items-center rounded-md px-1 py-0.5 transition";
  const clamp = "truncate max-w-[46vw] sm:max-w-none";
  if (crumb.href) {
    return (
      <Link
        href={crumb.href}
        className={`${shared} text-slate-500 hover:bg-slate-100 hover:text-indigo-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300`}
      >
        <span className={clamp}>{crumb.label}</span>
      </Link>
    );
  }
  return (
    <span aria-current="page" className={`${shared} font-bold text-slate-700 dark:text-slate-200`}>
      <span className={clamp}>{crumb.label}</span>
    </span>
  );
}

/**
 * 작업경로(빵부스크기). 지금 어디에 있는지 보여 주고 한 번에 이전 단계로 갈 수 있게 해요.
 * 항목이 3개 이상이면 휴대폰에서는 첫 항목과 마지막 항목만 보여 주고, 가운데는 … 으로 줄여요.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  const first = items[0];
  const last = items[items.length - 1];
  const middle = items.slice(1, -1);

  return (
    <nav aria-label="작업경로" data-testid="breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 flex-wrap items-center gap-y-0.5 text-xs">
        <li className="flex min-w-0 items-center">
          <CrumbBody crumb={first} />
        </li>
        {middle.length > 0 ? (
          <>
            <Separator />
            <li className="flex items-center px-0.5 text-slate-400 sm:hidden" aria-hidden="true">
              …
            </li>
            {middle.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="hidden min-w-0 items-center sm:flex">
                <CrumbBody crumb={crumb} />
              </li>
            ))}
          </>
        ) : null}
        {items.length > 1 ? (
          <>
            <Separator />
            <li className="flex min-w-0 items-center">
              <CrumbBody crumb={last} />
            </li>
          </>
        ) : null}
      </ol>
    </nav>
  );
}

/**
 * 헤더 바로 아래에 얇게 깔리는 작업경로 줄.
 * 아래로 스크롤해도 화면 맨 위에 붙어 있어서, 길어진 도구 화면을 훑다가도
 * 「지금 어디인지」와 이전 단계로 가는 링크를 잃지 않아요.
 * 맨 위에 붙는 순간 그림자가 생겨 내용과 분리돼요.
 */
export function BreadcrumbBar({
  width = "max-w-6xl",
  items,
}: {
  width?: "max-w-6xl" | "max-w-5xl";
  items: Crumb[];
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // 맨 위에 붙으면(sentinel 이 화면 밖으로 사라지면) 그림자를 보여 줘요.
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-0 w-full" />
      <div
        data-testid="breadcrumb-bar"
        data-stuck={stuck ? "true" : "false"}
        className={`sticky top-0 z-30 border-b bg-white/95 backdrop-blur transition-shadow dark:bg-slate-900/95 ${
          stuck
            ? "border-slate-300 shadow-lg shadow-slate-900/5 dark:border-slate-700 dark:shadow-black/40"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className={`mx-auto ${width} px-5 py-2.5`}>
          <Breadcrumb items={items} />
        </div>
      </div>
    </>
  );
}
