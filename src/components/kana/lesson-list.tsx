"use client";

import Link from "next/link";
import { isBridgeOpen, withBridges } from "@/lib/bridge/bridges";
import { LESSON_BY_ID, LESSONS } from "@/lib/kana/lessons";
import { cn } from "./ui";

/** 가나 레슨 목록. 첫 읽기(다리 레슨)는 열리는 레슨 바로 뒤에 끼운다 */
export function LessonList({
  completed,
  nextId,
}: {
  /** 끝낸 레슨·다리 id */
  completed: ReadonlySet<string>;
  /** 오늘 권하는 레슨·다리 id */
  nextId: string | null;
}) {
  return (
    <section>
      <h2 className="pb-2 text-sm text-ink-faint">레슨</h2>
      <ol className="flex flex-col gap-2">
        {withBridges(LESSONS).map((entry) => {
          if (entry.kind === "bridge") {
            const b = entry.bridge;
            const open = isBridgeOpen(b, completed);
            const done = completed.has(b.id);
            const after = LESSON_BY_ID.get(b.after);
            const body = (
              <>
                <span
                  lang="ja"
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                    done ? "bg-good/20 text-good" : "bg-accent/20 text-accent",
                  )}
                >
                  {done ? "✓" : "読"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{b.title}</span>
                  <span className="block truncate text-xs text-ink-soft">
                    {open
                      ? "배운 글자로 교재 문장 읽기"
                      : `${after?.title ?? b.after}까지 마치면 열림`}
                  </span>
                </span>
              </>
            );
            return (
              <li key={b.id}>
                {open ? (
                  <Link
                    href={`/kana/read/${b.id}`}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border border-accent/40 bg-bg-raised px-4 py-3",
                      nextId === b.id && "ring-2 ring-accent",
                    )}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 opacity-60">
                    {body}
                  </div>
                )}
              </li>
            );
          }
          const l = entry.lesson;
          const done = completed.has(l.id);
          return (
            <li key={l.id}>
              <Link
                href={`/kana/lesson/${l.id}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl bg-bg-raised px-4 py-3",
                  nextId === l.id && "ring-2 ring-accent",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                    done
                      ? "bg-good/20 text-good"
                      : "bg-bg-sunken text-ink-faint",
                  )}
                >
                  {done ? "✓" : LESSONS.indexOf(l) + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{l.title}</span>
                  <span
                    lang="ja"
                    className="block truncate text-xs text-ink-soft"
                  >
                    {l.glyphs}
                  </span>
                </span>
                <span className="text-xs text-ink-faint">
                  {l.script === "hira" ? "ひ" : "カ"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
