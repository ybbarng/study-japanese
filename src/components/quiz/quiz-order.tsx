"use client";

import { type RefObject, useState } from "react";
import { toKeyInput } from "@/components/keyboard/key-input";
import { cn } from "@/lib/cn";
import { choiceIndexFor } from "@/lib/keyboard/choice-key";
import { orderAccepted } from "@/lib/quiz/order";
import type { OrderQuestion } from "@/lib/quiz/types";
import type { RenderJa } from "./quiz-card";

/** 어순 맞추기: 조각을 눌러 차례대로 놓는다. 다 놓으면 맞는지 본다. 놓은 조각을 누르면 뺀다 */
export function OrderView({
  question: q,
  answered,
  correct,
  onDone,
  keys,
  renderJa,
}: {
  question: OrderQuestion;
  answered: boolean;
  correct: boolean;
  onDone: (correct: boolean) => void;
  /** 숫자 키(남은 조각 차례)로 놓고 Backspace로 뺀다 */
  keys: RefObject<(e: KeyboardEvent) => boolean>;
  renderJa: RenderJa;
}) {
  const [placed, setPlaced] = useState<number[]>([]);
  const rest = q.tiles.map((_, i) => i).filter((i) => !placed.includes(i));

  const place = (i: number) => {
    if (answered || placed.includes(i)) return;
    const next = [...placed, i];
    setPlaced(next);
    if (next.length === q.tiles.length)
      onDone(
        orderAccepted(
          next.map((t) => q.tiles[t]),
          q.shape,
        ),
      );
  };
  const remove = (i: number) => {
    if (answered) return;
    setPlaced(placed.filter((t) => t !== i));
  };

  keys.current = (e) => {
    if (answered) return false;
    if (e.key === "Backspace" && placed.length > 0) {
      setPlaced(placed.slice(0, -1));
      return true;
    }
    const k = choiceIndexFor(toKeyInput(e), rest.length);
    if (k === null) return false;
    place(rest[k]);
    return true;
  };

  return (
    <div>
      <p className="text-sm text-ink-soft">차례대로 눌러 문장을 만드세요</p>
      <p className="mt-2 text-lg">“{q.ko}”</p>
      <div
        className={cn(
          "mt-3 flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2",
          answered
            ? correct
              ? "border-good bg-good/10"
              : "border-accent bg-accent-soft"
            : "border-line",
        )}
        data-order-answer
      >
        {placed.map((i) => (
          <button
            key={i}
            type="button"
            disabled={answered}
            onClick={() => remove(i)}
            className="rounded-lg bg-bg px-3 py-1.5 font-ja-serif text-xl"
          >
            {renderJa(q.tiles[i], {
              ruby: true,
              tokens: q.tileTokens[q.tiles[i]],
            })}
          </button>
        ))}
        {placed.length > 0 ? (
          <span lang="ja" className="font-ja-serif text-xl">
            {q.tail}
          </span>
        ) : (
          <span className="text-sm text-ink-faint">여기에 놓입니다</span>
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2" aria-label="조각">
        {rest.map((i, k) => (
          <li key={i}>
            <button
              type="button"
              disabled={answered}
              onClick={() => place(i)}
              className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 font-ja-serif text-xl lg:hover:border-accent"
            >
              <kbd
                aria-hidden
                className="hidden rounded border border-line px-1 font-mono text-xs text-ink-faint lg:inline"
              >
                {k + 1}
              </kbd>
              {renderJa(q.tiles[i], {
                ruby: true,
                tokens: q.tileTokens[q.tiles[i]],
              })}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
