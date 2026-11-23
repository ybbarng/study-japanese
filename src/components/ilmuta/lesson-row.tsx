import Link from "next/link";
import { cn } from "@/lib/cn";
import { lessonLabel, registerLabel } from "@/lib/ilmuta/labels";
import type { LessonRow as Row } from "@/lib/ilmuta/server-data";
import { ProgressPips } from "./progress-pips";

/** 지도의 한 줄: 번호·일본어 제목·뜻·말투, 들은 정도와 쓰기 */
export function LessonRow({ row, current }: { row: Row; current: boolean }) {
  const p = row.progress;
  const register = registerLabel(row.register);
  return (
    <Link
      href={`/ilmuta/${row.no}`}
      id={`lesson-${row.no}`}
      className={cn(
        "flex items-center gap-4 rounded-2xl px-4 py-3 active:bg-bg-raised lg:h-full lg:bg-bg-raised/40 lg:hover:bg-bg-raised",
        current && "bg-bg-raised ring-1 ring-accent",
      )}
    >
      <span
        className={cn(
          "w-9 shrink-0 text-right font-mono text-xl",
          p.lectureDone ? "text-accent" : "text-ink-faint",
        )}
      >
        {row.no}
      </span>
      <span className="min-w-0 flex-1">
        {row.title ? (
          <span lang="ja" className="block truncate font-ja-serif text-xl">
            {row.title}
          </span>
        ) : (
          <span className="block text-xl">{lessonLabel(row.no)}</span>
        )}
        <span className="mt-0.5 flex items-center gap-2 text-sm text-ink-soft">
          {row.titleKo ? <span className="truncate">{row.titleKo}</span> : null}
          {register ? (
            <span className="shrink-0 rounded-full border border-line px-1.5 text-xs text-ink-faint">
              {register}
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 flex items-center gap-3 text-xs text-ink-faint">
          <ProgressPips pips={p.pips} />
          {p.examplesTotal > 0 ? (
            <span>
              예문 {p.examplesHeard}/{p.examplesTotal}
            </span>
          ) : null}
          {row.no > 0 ? (
            <span className={p.writingDone ? "text-good" : undefined}>
              {p.writingDone ? "문장 3개 씀" : `문장 ${p.written}/3`}
            </span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
