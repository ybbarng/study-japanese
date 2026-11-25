"use client";

import { cn } from "@/lib/cn";
import type { Position } from "@/lib/writing/practice";
import type { WritingItem, WritingSet } from "@/lib/writing/sets";

export type ItemMark = "solo" | "done" | null;

/** 글자 묶음 → 행 → 글자 고르기 */
export function CharPicker({
  sets,
  set,
  at,
  markOf,
  onSet,
  onPick,
}: {
  sets: readonly WritingSet[];
  set: WritingSet;
  at: Position;
  markOf: (item: WritingItem) => ItemMark;
  onSet: (id: string) => void;
  onPick: (p: Position) => void;
}) {
  const row = set.rows.find((r) => r.id === at.rowId) ?? set.rows[0];
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="글자 묶음" className="flex gap-2">
        {sets.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === set.id}
            onClick={() => onSet(x.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm",
              x.id === set.id
                ? "bg-accent text-white"
                : "bg-bg-raised text-ink-soft lg:hover:text-ink",
            )}
          >
            {x.title}
          </button>
        ))}
      </div>
      <fieldset className="-mx-5 flex min-w-0 gap-1.5 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        <legend className="sr-only">행</legend>
        {set.rows.map((r) => (
          <button
            key={r.id}
            type="button"
            lang={set.lang}
            aria-pressed={r.id === row.id}
            onClick={() => onPick({ rowId: r.id, index: 0 })}
            className={cn(
              "shrink-0 rounded-xl px-3 py-1.5 text-sm",
              r.id === row.id
                ? "bg-accent-soft text-accent"
                : "bg-bg-raised text-ink-soft lg:hover:text-ink",
            )}
          >
            {r.label}
          </button>
        ))}
      </fieldset>
      <fieldset className="flex min-w-0 flex-wrap gap-2">
        <legend className="sr-only">{row.label} 글자</legend>
        {row.items.map((it, i) => {
          const mark = markOf(it);
          return (
            <button
              key={it.text}
              type="button"
              lang={set.lang}
              aria-pressed={i === at.index}
              aria-label={`${it.text} (${it.hint}) 쓰기`}
              onClick={() => onPick({ rowId: row.id, index: i })}
              className={cn(
                "relative flex h-12 min-w-12 items-center justify-center rounded-xl px-2 font-ja-serif text-2xl",
                i === at.index
                  ? "bg-ink text-bg"
                  : "bg-bg-raised text-ink lg:hover:ring-1 lg:hover:ring-accent/50",
              )}
            >
              {it.text}
              {mark ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1 right-1 h-1.5 w-1.5 rounded-full",
                    mark === "solo" ? "bg-good" : "bg-ink-faint",
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
