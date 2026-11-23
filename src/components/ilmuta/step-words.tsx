"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { KIND_LABEL } from "@/lib/ilmuta/labels";
import { examplesOf } from "@/lib/ilmuta/steps";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { Sentence } from "@/lib/textbook/schema";
import type { StepProps } from "./lesson-types";
import { PlayCard } from "./play-card";
import { RubyText } from "./ruby-text";
import { ToggleChips } from "./toggle-chips";
import { useNowPlaying, usePlay } from "./use-player-bridge";

/** 단어 카드: 누르면 단어 소리가 나오고, 뜻 가리기를 켜면 눌러서 뜻을 확인한다 */
export function StepWords({ data, listens }: StepProps) {
  const { lesson } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const [hideMeaning, setHideMeaning] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  return (
    <div className="space-y-5">
      {examplesOf(lesson, "words").map((example) => {
        const track = exampleTrack(lesson, example);
        const active = now.item === example.id;
        return (
          <section key={example.id} className="space-y-4">
            <PlayCard
              title={KIND_LABEL[example.kind]}
              note={`단어 ${example.sentences.length}개`}
              durationSec={example.durationSec}
              count={listens[example.id]}
              playing={active && now.playing}
              onPress={() => play([track])}
            />
            <div className="flex items-center justify-between gap-3">
              <ToggleChips
                toggles={[
                  {
                    id: "hide",
                    label: "뜻 가리기",
                    on: hideMeaning,
                    strike: false,
                  },
                ]}
                onChange={(_, on) => {
                  setHideMeaning(on);
                  setRevealed(new Set());
                }}
              />
              {hideMeaning ? (
                <span className="text-xs text-ink-faint">
                  떠올려 본 뒤 눌러서 확인
                </span>
              ) : null}
            </div>
            <ul className="grid grid-cols-2 gap-3">
              {example.sentences.map((w) => (
                <li key={w.ja}>
                  <WordCard
                    word={w}
                    showMeaning={!hideMeaning || revealed.has(w.ja)}
                    onPress={() => {
                      setRevealed((s) => new Set(s).add(w.ja));
                      play([track], 0, false);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function WordCard({
  word,
  showMeaning,
  onPress,
}: {
  word: Sentence;
  showMeaning: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex h-full min-h-32 w-full flex-col items-center justify-center rounded-2xl bg-bg-raised px-2 py-4 text-center active:bg-bg-sunken"
    >
      <RubyText
        text={word.ja}
        reading={word.reading}
        className="font-ja-serif text-3xl leading-loose"
      />
      <span
        className={cn(
          "mt-1 text-sm",
          showMeaning ? "text-ink-soft" : "text-ink-faint",
        )}
      >
        {showMeaning ? word.ko : "뜻은?"}
      </span>
    </button>
  );
}
