import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { BreadcrumbBar, type Crumb } from "@/components/Breadcrumb";
import { ThemeToggle } from "@/components/ThemeToggle";

/** 모든 페이지 공통 헤더. 오른쪽 끝에는 항상 라이트·다크 모드 아이콘이 있어요. */
export function SiteHeader({
  width = "max-w-6xl",
  tagline,
  label,
  trailing,
}: {
  width?: "max-w-6xl" | "max-w-5xl";
  tagline?: string;
  label?: string;
  trailing?: ReactNode;
}) {
  return (
    <header
      data-testid="site-header"
      className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
    >
      <div className={`mx-auto flex ${width} items-center justify-between gap-3 px-5 py-3.5`}>
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark tagline={tagline} />
          {label ? (
            <>
              <span className="hidden h-7 w-px bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden="true" />
              <span className="hidden text-xs font-bold text-slate-400 sm:block">{label}</span>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {trailing}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * 헤더 + 작업경로를 한 묶음으로 쓰는 페이지 상단.
 * 작업경로가 항상 헤더 바로 아래 같은 위치에 오므로, 어떤 화면에서도 「지금 어디인지」가 같은 자리에서 보여요.
 */
export function SiteHeaderWithBreadcrumb({
  width = "max-w-6xl",
  tagline,
  label,
  trailing,
  crumbs,
}: {
  width?: "max-w-6xl" | "max-w-5xl";
  tagline?: string;
  label?: string;
  trailing?: ReactNode;
  crumbs: Crumb[];
}) {
  return (
    <>
      <SiteHeader width={width} tagline={tagline} label={label} trailing={trailing} />
      <BreadcrumbBar width={width} items={crumbs} />
    </>
  );
}

export function SiteFooter({
  width = "max-w-6xl",
  children,
}: {
  width?: "max-w-6xl" | "max-w-5xl";
  children: ReactNode;
}) {
  return (
    <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
      <div className={`mx-auto ${width} px-5`}>{children}</div>
    </footer>
  );
}
