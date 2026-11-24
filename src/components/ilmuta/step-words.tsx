"use client";

import { useMemo, useState } from "react";
import {
  useFollowIndex,
  useFollowScroll,
} from "@/components/context/use-follow";
import { WordPicture } from "@/components/pictures/word-picture";
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
            <WordGrid
              id={example.id}
              words={example.sentences}
              showMeaning={(w) => !hideMeaning || revealed.has(w.ja)}
              onPress={(w) => {
                setRevealed((s) => new Set(s).add(w.ja));
                play([track], 0, false);
              }}
            />
          </section>
        );
      })}
    </div>
  );
}

/** 단어 카드 묶음. 단어 오디오를 틀면 지금 소리 나는 낱말이 강조되고 화면이 그 낱말을 따라간다 */
function WordGrid({
  id,
  words,
  showMeaning,
  onPress,
}: {
  id: string;
  words: Sentence[];
  showMeaning: (w: Sentence) => boolean;
  onPress: (w: Sentence) => void;
}) {
  const items = useMemo(() => [id], [id]);
  const current = useFollowIndex("ilmuta", items, words);
  useFollowScroll(
    current >= 0 ? `${id}-${current}` : null,
    `[data-follow="${id}"] [aria-current="true"]`,
  );
  return (
    <ul
      data-follow={id}
      className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4"
    >
      {words.map((w, i) => (
        <li key={w.ja}>
          <WordCard
            word={w}
            current={i === current}
            showMeaning={showMeaning(w)}
            onPress={() => onPress(w)}
          />
        </li>
      ))}
    </ul>
  );
}

function WordCard({
  word,
  current,
  showMeaning,
  onPress,
}: {
  word: Sentence;
  current: boolean;
  showMeaning: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-current={current ? "true" : undefined}
      className={cn(
        "flex h-full min-h-32 w-full flex-col items-center justify-center rounded-2xl px-2 py-4 text-center transition-colors active:bg-bg-sunken lg:min-h-40",
        current
          ? "bg-accent-soft ring-2 ring-accent"
          : "bg-bg-raised lg:hover:ring-1 lg:hover:ring-accent/50",
      )}
    >
      {/* 그림은 뜻을 알려 주므로 뜻을 가렸을 때는 숨긴다 */}
      {showMeaning ? (
        <WordPicture ja={word.ja} size={56} className="mb-1" />
      ) : null}
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
