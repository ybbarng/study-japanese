"use client";

import type { Piece } from "@/lib/bridge/pieces";
import { getSound } from "@/lib/kana/data";
import { canPlay, playSound, playWord } from "./audio";
import { cn } from "./ui";

function pieceSound(p: Piece): string {
  if (p.kind === "kana") return getSound(p.soundId).ko;
  if (p.kind === "mark") return p.mark === "sokuon" ? "(쉼)" : "(길게)";
  return "";
}

/**
 * 교재 문장 한 줄을 글자마다 누를 수 있게. 가나는 그 글자 소리, 한자는 후리가나 소리를
 * 한 글자씩 낸다. `showSounds`면 글자 밑에 한글 소리를 적는다.
 */
export function BridgeSentence({
  pieces,
  showSounds,
}: {
  pieces: Piece[];
  showSounds: boolean;
}) {
  return (
    <p
      lang="ja"
      className="flex flex-wrap items-end justify-center gap-x-0.5 gap-y-3 font-ja-serif"
    >
      {pieces.map((p, k) => {
        const key = `${k}-${p.text}`;
        if (p.kind === "punct" || p.kind === "unknown")
          return (
            <span key={key} className="pb-7 text-4xl text-ink-soft lg:text-5xl">
              {p.text}
            </span>
          );
        if (p.kind === "kanji")
          return (
            <button
              key={key}
              type="button"
              onClick={() => void playWord(p.reading)}
              aria-label={`${p.text} 읽는 법 ${p.reading} 듣기`}
              className="flex flex-col items-center rounded-xl px-1 active:bg-bg-raised"
            >
              <ruby className="text-5xl lg:text-7xl">
                {p.text}
                <rt className="text-base text-accent">{p.reading}</rt>
              </ruby>
              <span className="h-7 pt-1 font-sans text-sm text-ink-soft">
                {showSounds ? p.units.map(pieceSound).join("") : ""}
              </span>
            </button>
          );
        const playable = p.kind === "kana" && canPlay(p.soundId);
        return (
          <button
            key={key}
            type="button"
            disabled={p.kind !== "kana"}
            onClick={() => {
              if (p.kind === "kana") void playSound(p.soundId);
            }}
            aria-label={`${p.text} 소리 듣기`}
            className={cn(
              "flex flex-col items-center rounded-xl px-0.5 active:bg-bg-raised",
              !playable && "cursor-default",
            )}
          >
            <span className="text-5xl lg:text-7xl">{p.text}</span>
            <span className="h-7 pt-1 font-sans text-sm text-ink-soft">
              {showSounds ? pieceSound(p) : ""}
            </span>
          </button>
        );
      })}
    </p>
  );
}
