import { ToolCard } from "@/components/ToolCard";
import { COMMON_RULES, HOW_TO_OPEN, type Tool } from "@/lib/tools";

const CARD =
  "rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";
const HEADING = "text-lg font-black tracking-tight text-slate-900 dark:text-slate-100";

export function ToolTags({ tool }: { tool: Tool }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
        {tool.category}
      </span>
      {tool.who.map((w) => (
        <span
          key={w}
          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
        >
          {w}
        </span>
      ))}
      {tool.shape.map((s) => (
        <span
          key={s}
          className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

/** 실제로 동작하는 도구 본체(iframe) */
export function ToolFrame({ tool }: { tool: Tool }) {
  return (
    <div
      data-testid="tool-frame"
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/60">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full bg-rose-300" />
          <span className="h-3 w-3 rounded-full bg-amber-300" />
          <span className="h-3 w-3 rounded-full bg-emerald-300" />
        </span>
        <span className="ml-2 truncate rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          /tools/{tool.slug}.html
        </span>
        <span className="ml-auto hidden text-[11px] text-slate-400 sm:block">
          입력한 내용은 이 브라우저에만 저장돼요
        </span>
      </div>
      <iframe
        src={`/tools/${tool.slug}.html`}
        title={tool.title}
        allow="fullscreen; clipboard-write"
        allowFullScreen
        className="tool-iframe block w-full border-0"
        style={{ height: tool.height ?? 560 }}
      />
    </div>
  );
}

export function UseCasesSection({ tool }: { tool: Tool }) {
  return (
    <section data-testid="section-usecases" className="mt-10">
      <h2 className={HEADING}>이럴 때 좋아요</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {tool.useCases.map((uc) => (
          <div key={uc.who} className={`${CARD} p-4`}>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              {uc.who}
            </span>
            <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">{uc.when}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{uc.how}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ChangeTipsSection({ tool }: { tool: Tool }) {
  return (
    <section data-testid="section-tips" className="mt-10">
      <h2 className={HEADING}>우리 팀 방식으로 바꿔 보기</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        코드를 복사해 메모장에 저장한 뒤, 아래 중 하나씩만 고쳐 보세요. 고치는 김에 AI에게
        「이것도 같이 바꿔 줘」라고 물어도 좋아요.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {tool.changeTips.map((tip) => (
          <li
            key={tip}
            className={`${CARD} flex gap-2.5 p-3.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300`}
          >
            <span aria-hidden="true" className="mt-0.5 text-indigo-400">✎</span>
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PromptSection({ tool, prompt }: { tool: Tool; prompt: string }) {
  return (
    <section data-testid="section-prompt" className="mt-10">
      <h2 className={HEADING}>🤖 내 상황에 맞게 다시 만들기</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        프롬프트를 복사해 내 AI에 붙여 넣으면 검토표 화면부터 열려요. 위 「AI 프롬프트 복사」 버튼을
        누르면 아래 전체가 통째로 복사됩니다.
      </p>
      <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
            [업무 도구 주문서] {tool.title}
          </span>
          <span className="text-[11px] text-indigo-500 dark:text-indigo-300/80">
            채팅 AI · 코드 AI · 앱 빌더 어디서나
          </span>
        </div>
        <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-white p-4 text-[12px] leading-relaxed text-slate-600 ring-1 ring-indigo-100 dark:bg-slate-950 dark:text-slate-300 dark:ring-indigo-500/20">
          {prompt}
        </pre>
        <p className="mt-2 text-[11px] text-indigo-500 dark:text-indigo-300/80">
          복사가 막히면 위 글을 직접 선택해 복사해도 같아요.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`${CARD} p-4`}>
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">화면 띄우는 법</p>
          <pre className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {HOW_TO_OPEN}
          </pre>
        </div>
        <div className={`${CARD} p-4`}>
          <p className="text-xs font-black text-slate-700 dark:text-slate-200">공통 · 어디서든 알아서</p>
          <pre className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
            {COMMON_RULES}
          </pre>
        </div>
      </div>
    </section>
  );
}

export function RelatedSection({
  category,
  tools,
  newSlugs,
}: {
  category: string;
  tools: Tool[];
  newSlugs: Set<string>;
}) {
  if (tools.length === 0) return null;
  return (
    <section data-testid="section-related" className="mt-10">
      <h2 className={HEADING}>{category}의 다른 도구</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <ToolCard key={t.slug} tool={t} promptCopies={0} isNew={newSlugs.has(t.slug)} />
        ))}
      </div>
    </section>
  );
}
