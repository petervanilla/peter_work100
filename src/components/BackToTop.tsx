"use client";

import { useEffect, useState } from "react";

/** 오른쪽 아래에 떠 있는 '맨 위로' 버튼. 내려간 만큼만 보여요. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="맨 위로 가기"
      title="맨 위로 가기"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`no-print fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white/95 text-lg font-black text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:-translate-y-0.5 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300 dark:shadow-black/40 dark:hover:text-indigo-300 ${
        show ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <span aria-hidden="true">↑</span>
    </button>
  );
}
