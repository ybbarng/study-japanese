"use client";

import { useEffect, useState } from "react";
import { getSound } from "@/lib/kana/data";
import type { Word } from "@/lib/kana/lessons";
import { kanaToRomaji, tokenize } from "@/lib/kana/text";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, SecondaryButton, SoundButton } from "./ui";

/** 배운 글자만으로 된 낱말을 스스로 읽어 보고, 눌러서 읽는 법과 뜻을 확인한다. */
export function WordsStep({
  words,
  onDone,
  onProgress,
}: {
  words: Word[];
  onDone: (read: number) => void;
  onProgress: (f: number) => void;
}) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [read, setRead] = useState(0);
  const word = words[i];

  useEffect(() => onProgress(i / words.length), [i, words.length, onProgress]);

  const next = (gotIt: boolean) => {
    const r = read + (gotIt ? 1 : 0);
    setRead(r);
    if (i + 1 >= words.length) onDone(r);
    else {
      setI(i + 1);
      setShown(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-center text-sm text-ink-soft">
        배운 글자로 읽을 수 있는 낱말이에요. 소리 내어 읽어 보세요.
      </p>
      <div
        key={i}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-6",
          s.enter,
        )}
      >
        <div className="flex flex-wrap items-end justify-center gap-1">
          {tokenize(word.kana).map((u, k) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: 글자 순서가 곧 자리
              key={k}
              className="flex flex-col items-center"
            >
              <Glyph className="text-7xl">{u.text}</Glyph>
              <span
                className={cn(
                  "h-6 pt-1 text-sm text-ink-soft transition-opacity",
                  shown ? "opacity-100" : "opacity-0",
                )}
              >
                {u.soundId
                  ? getSound(u.soundId).ko
                  : u.mark === "sokuon"
                    ? "(쉼)"
                    : u.mark === "chouon"
                      ? "(길게)"
                      : ""}
              </span>
            </span>
          ))}
        </div>
        {shown ? (
          <div className={cn("flex flex-col items-center gap-3", s.pop)}>
            <p className="text-ink-soft">{kanaToRomaji(word.kana)}</p>
            <p className="text-3xl font-bold">{word.meaning}</p>
            <SoundButton word={word.kana} autoPlay />
          </div>
        ) : (
          <div className="h-[8.5rem]" />
        )}
      </div>
      <div className="flex gap-3 pt-4">
        {shown ? (
          <>
            <SecondaryButton onClick={() => next(false)}>
              못 읽었어요
            </SecondaryButton>
            <PrimaryButton onClick={() => next(true)}>읽었어요</PrimaryButton>
          </>
        ) : (
          <PrimaryButton onClick={() => setShown(true)}>
            읽는 법과 뜻 보기
          </PrimaryButton>
        )}
      </div>
      <p className="pt-2 text-center text-xs text-ink-faint">
        {i + 1} / {words.length}
      </p>
    </div>
  );
}
