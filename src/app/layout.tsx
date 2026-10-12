import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "업무앱 · 업무효율 100",
  description:
    "매일의 업무 보고·회의·정리에 바로 쓰는 무료 도구 모음. 코드와 AI 프롬프트를 복사해 우리 팀에 맞게 고쳐 쓰세요.",
};

/**
 * 화면이 그려지기 전에 라이트/다크를 정해서 '번쩍' 하는 깜빡임을 막아요.
 * 저장한 선택("light" | "dark")이 있으면 그걸 쓰고, 없으면 기기(시스템) 설정을 따라요.
 * 저장 키 'app-theme' 는 ThemeToggle 과 같아야 해요.
 */
const themeScript = `(function(){try{var s=localStorage.getItem("app-theme");var d=(s==="dark"||s==="light")?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // 스크립트가 html 의 class 를 미리 바꾸므로, 이 요소만 hydration 경고를 끕니다.
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
