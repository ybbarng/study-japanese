"use client";

import { PictureMark } from "@/components/pictures/picture-mark";
import { cn } from "@/lib/cn";
import type { CueWord } from "@/lib/context/cards";
import { chipKey, chipTokens } from "@/lib/word-tap/chip-tokens";
import { useWordTap } from "./word-tap-provider";

/**
 * 자막 카드의 낱말 칩 줄. 강·과 화면(낱말 누르기 공급자 안)에서는 칩을 누르면 낱말 정보 창이 열린다
 * (분석 파일이 없는 받아 적은 줄도 칩 단위로). 공급자 밖(전역 재생 화면)에서는 칩만 보인다.
 */
export function CueChipList({ words }: { words: CueWord[] }) {
  const tap = useWordTap();
  if (words.length === 0) return null;
  const key = chipKey(words);
  return (
    <ul aria-label="이 말의 낱말" className="mt-3 flex flex-wrap gap-2">
      {words.map((w, i) => {
        const body = <ChipBody w={w} />;
        const chipClass =
          "rounded-xl bg-bg-raised px-3 py-1.5 text-sm leading-tight";
        if (!tap)
          return (
            <li key={w.ja} className={chipClass}>
              {body}
            </li>
          );
        const pressed = tap.selected?.ja === key && tap.selected.index === i;
        return (
          <li key={w.ja}>
            <button
              type="button"
              data-word-chip
              aria-haspopup="dialog"
              aria-pressed={pressed}
              onClick={(e) =>
                tap.select(
                  { ja: key, index: i, chips: chipTokens(words) },
                  e.currentTarget,
                )
              }
              className={cn(
                chipClass,
                "border border-transparent text-left hover:border-line",
                pressed && "border-accent bg-accent-soft",
              )}
            >
              {body}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ChipBody({ w }: { w: CueWord }) {
  return (
    <>
      <PictureMark
        picture={w.picture}
        emoji={w.emoji}
        size={w.picture ? 28 : 20}
        className="mr-1.5 -my-1"
      />
      <span lang="ja" className="font-ja-serif text-base text-ink">
        {w.ja}
      </span>
      {w.reading ? (
        <span lang="ja" className="ml-1.5 text-ink-soft">
          {w.reading}
        </span>
      ) : null}
      <span className="ml-1.5 text-ink-soft">{w.ko}</span>
    </>
  );
}
