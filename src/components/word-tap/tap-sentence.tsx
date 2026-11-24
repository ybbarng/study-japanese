"use client";

import type { ReactNode } from "react";
import { Ruby } from "@/components/songs/line-words";
import { cn } from "@/lib/cn";
import { wordRuby } from "@/lib/songs/words";
import { isTapToken } from "@/lib/word-tap/tokens";
import { useWordTap } from "./word-tap-provider";

interface Props {
  ja: string;
  showReading: boolean;
  className?: string;
  /** 누를 조각이 없을 때(분석이 없거나 공급자 밖) 그릴 원래 글 */
  fallback: ReactNode;
}

/**
 * 교재 문장. 낱말 분석이 있으면 낱말마다 눌러 정보 창을 연다(분석이 없으면 초반 강에서만 글자 하나씩).
 * 단추 안에 넣지 않는다(단추 안 단추가 된다).
 */
export function TapSentence({ ja, showReading, className, fallback }: Props) {
  const tap = useWordTap();
  const tokens = tap?.tokensOf(ja);
  if (!tap || !tokens) return fallback;
  const selected = tap.selected?.ja === ja ? tap.selected.index : -1;
  return (
    <span lang="ja" className={cn("[&_rt]:text-[0.45em]", className)}>
      {tokens.map((t, i) =>
        isTapToken(t) ? (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: 같은 낱말이 한 문장에 두 번 나올 수 있다
            key={i}
            type="button"
            data-word-tap
            onClick={(e) => tap.select({ ja, index: i }, e.currentTarget)}
            aria-pressed={selected === i}
            aria-haspopup="dialog"
            className={cn(
              "rounded-md px-px underline decoration-line decoration-dotted underline-offset-[6px] hover:bg-bg-sunken focus-visible:outline-2 focus-visible:outline-accent",
              selected === i && "bg-accent-soft text-accent decoration-accent",
            )}
          >
            <Ruby segments={wordRuby(t)} showReading={showReading} />
          </button>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: 글 조각 차례가 곧 열쇠다
          <span key={i}>{t.surface}</span>
        ),
      )}
    </span>
  );
}
