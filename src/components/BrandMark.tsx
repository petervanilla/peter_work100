import Link from "next/link";

export function BrandMark({
  href = "/tools",
  tagline,
  size = "md",
}: {
  href?: string;
  tagline?: string;
  size?: "sm" | "md";
}) {
  const compact = size === "sm";
  return (
    <Link
      href={href}
      aria-label="업무앱 홈"
      className={`group inline-flex min-w-0 items-center ${compact ? "gap-2" : "gap-2.5"}`}
    >
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-200 transition group-hover:shadow-md group-hover:shadow-indigo-200 dark:shadow-none ${compact ? "h-8 w-8" : "h-9 w-9"}`}
      >
        <svg viewBox="0 0 24 24" fill="none" className={compact ? "h-4 w-4" : "h-[18px] w-[18px]"}>
          <rect x="3" y="3" width="8" height="8" rx="2" fill="white" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" fill="white" fillOpacity=".72" />
          <rect x="13" y="10" width="8" height="11" rx="2" fill="white" fillOpacity=".88" />
          <rect x="3" y="13" width="8" height="8" rx="2" fill="white" fillOpacity=".58" />
        </svg>
      </span>
      <span className="min-w-0">
        <span
          className={`block font-black tracking-tight text-slate-900 group-hover:text-indigo-700 dark:text-slate-100 dark:group-hover:text-indigo-300 ${compact ? "text-sm" : "text-[15px]"}`}
        >
          업무앱
        </span>
        {tagline ? (
          <span className="mt-0.5 block truncate text-[10px] text-slate-400 sm:text-[11px]">
            {tagline}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
