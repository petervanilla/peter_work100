"use client";

import { useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/** layout.tsx 의 깜빡임 방지 스크립트와 같은 키 */
const STORAGE_KEY = "app-theme";

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/* <html> 의 class 가 바뀌면 알려 주는 구독. 서버에서는 값을 모르므로 null 로 시작해요. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";
const getServerSnapshot = (): Theme | null => null;

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

const BUTTON =
  "grid h-8 w-8 place-items-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500";

/**
 * 라이트(해) · 다크(달) 아이콘 두 개.
 * 어느 쪽이 켜져 있는지는 JS 상태가 아니라 <html class="dark"> 에 따라 CSS 로 바로 바뀌어서
 * 첫 화면부터 정확하고 깜빡임이 없어요.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, getSnapshot, getServerSnapshot);

  // 다른 탭에서 바꾸거나, 저장한 선택이 없을 때 기기 설정이 바뀌면 따라가요.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const systemTheme = (): Theme => (media.matches ? "dark" : "light");
    const onSystemChange = () => {
      if (!readStored()) applyTheme(systemTheme());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) applyTheme(readStored() ?? systemTheme());
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function choose(next: Theme) {
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 저장이 막힌 브라우저에서도 이번 화면에서는 바뀌어요 */
    }
  }

  return (
    <div
      data-testid="theme-toggle"
      role="group"
      aria-label="화면 모드"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
    >
      <button
        type="button"
        data-theme-option="light"
        aria-label="라이트 모드"
        title="라이트 모드"
        aria-pressed={theme === null ? undefined : theme === "light"}
        onClick={() => choose("light")}
        className={`${BUTTON} bg-white text-amber-600 shadow-sm ring-1 ring-slate-200 dark:bg-transparent dark:text-slate-400 dark:shadow-none dark:ring-0 dark:hover:text-slate-200`}
      >
        <SunIcon />
      </button>
      <button
        type="button"
        data-theme-option="dark"
        aria-label="다크 모드"
        title="다크 모드"
        aria-pressed={theme === null ? undefined : theme === "dark"}
        onClick={() => choose("dark")}
        className={`${BUTTON} bg-transparent text-slate-500 hover:text-slate-800 dark:bg-slate-950 dark:text-indigo-300 dark:ring-1 dark:ring-slate-700 dark:hover:text-indigo-200`}
      >
        <MoonIcon />
      </button>
    </div>
  );
}
