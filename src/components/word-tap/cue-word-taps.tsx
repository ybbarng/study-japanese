"use client";

import { cn } from "@/lib/cn";
import { isTapToken } from "@/lib/word-tap/tokens";
import { useWordTap } from "./word-tap-provider";

/**
 * 자막 문장 카드 밑의 낱말 단추 줄. 카드의 큰 글은 "그 말부터 다시 듣기" 단추 안에 있어
 * 낱말을 바로 누를 수 없으므로, 분석이 있는 문장은 낱말을 따로 늘어놓아 누르게 한다.
 * 공급자 밖(전역 재생 화면)이나 분석이 없는 문장은 그리지 않는다.
 */
export function CueWordTaps({ sentences }: { sentences: readonly string[] }) {
  const tap = useWordTap();
  if (!tap) return null;
  const rows = sentences.flatMap((ja) => {
    const analysis = tap.data.analyses[ja];
    const tokens = analysis ? tap.tokensOf(ja) : null;
    return tokens ? [{ ja, tokens }] : [];
  });
  if (rows.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-2">
      {rows.map(({ ja, tokens }) => (
        <ul
          key={ja}
          aria-label="낱말 눌러 보기"
          className="flex flex-wrap gap-1.5"
        >
          {tokens.map((t, i) =>
            isTapToken(t) ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: 같은 낱말이 두 번 나올 수 있다
              <li key={i}>
                <button
                  type="button"
                  data-word-tap
                  onClick={(e) => tap.select({ ja, index: i }, e.currentTarget)}
                  aria-haspopup="dialog"
                  aria-pressed={
                    tap.selected?.ja === ja && tap.selected.index === i
                  }
                  className={cn(
                    "rounded-lg border border-line px-2 py-0.5 font-ja-serif text-base hover:bg-bg-raised",
                    tap.selected?.ja === ja &&
                      tap.selected.index === i &&
                      "border-accent bg-accent-soft text-accent",
                  )}
                >
                  <span lang="ja">{t.surface}</span>
                </button>
              </li>
            ) : null,
          )}
        </ul>
      ))}
    </div>
  );
}
