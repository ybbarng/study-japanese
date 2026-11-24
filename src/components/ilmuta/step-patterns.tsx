"use client";

import { useMemo } from "react";
import {
  useFollowIndex,
  useFollowScroll,
} from "@/components/context/use-follow";
import { cn } from "@/lib/cn";
import { KIND_LABEL } from "@/lib/ilmuta/labels";
import { groupByPattern } from "@/lib/ilmuta/patterns";
import type { Glossary } from "@/lib/ilmuta/ruby";
import { examplesOf } from "@/lib/ilmuta/steps";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { Example } from "@/lib/textbook/schema";
import type { StepProps } from "./lesson-types";
import { PlayCard } from "./play-card";
import {
  type Display,
  SentenceView,
  useSentenceDisplay,
} from "./sentence-display";
import { useNowPlaying, usePlay } from "./use-player-bridge";

/** 문형 머리 아래에 그 문형의 예문. 일본어·읽는 법·뜻을 따로 켜고 끈다 */
export function StepPatterns({ data, listens }: StepProps) {
  const { lesson, glossary } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const { display, chips, isRevealed, reveal } = useSentenceDisplay();

  return (
    <div className="space-y-6">
      {examplesOf(lesson, "patterns").map((example) => (
        <section key={example.id} className="space-y-5">
          <PlayCard
            title={KIND_LABEL[example.kind]}
            note={`문형 ${example.patterns?.length ?? 0}개 · 예문 ${example.sentences.length}개`}
            durationSec={example.durationSec}
            count={listens[example.id]}
            playing={now.item === example.id && now.playing}
            onPress={() => play([exampleTrack(lesson, example)])}
          />
          {chips}
          <PatternGroups
            example={example}
            glossary={glossary}
            display={display}
            isRevealed={isRevealed}
            reveal={reveal}
          />
        </section>
      ))}
    </div>
  );
}

/** 문형별 예문 묶음. 예문 오디오를 틀면 지금 소리 나는 예문이 강조되고 화면이 그 예문을 따라간다 */
function PatternGroups({
  example,
  glossary,
  display,
  isRevealed,
  reveal,
}: {
  example: Example;
  glossary: Glossary;
  display: Display;
  isRevealed: (key: string) => boolean;
  reveal: (key: string) => void;
}) {
  const items = useMemo(() => [example.id], [example.id]);
  const current = useFollowIndex("ilmuta", items, example.sentences);
  useFollowScroll(
    current >= 0 ? `${example.id}-${current}` : null,
    `[data-follow="${example.id}"] [aria-current="true"]`,
  );
  return (
    <div data-follow={example.id} className="space-y-5">
      {groupByPattern(example).map((g) => (
        <article
          key={g.head?.no ?? `loose`}
          className="rounded-2xl bg-bg-raised p-4 lg:p-6"
        >
          {g.head ? (
            <header className="border-b border-line pb-3">
              <p className="text-xs text-accent">문형 {g.head.no}</p>
              <p lang="ja" className="mt-1 font-ja-serif text-2xl lg:text-4xl">
                {g.head.ja}
              </p>
              <p className="text-sm text-ink-soft lg:text-base">{g.head.ko}</p>
            </header>
          ) : null}
          <ul className="mt-3 space-y-2">
            {g.sentences.map((s, i) => {
              const key = `${example.id}-${g.head?.no ?? 0}-${i}`;
              const isCurrent = example.sentences.indexOf(s) === current;
              return (
                <li
                  key={key}
                  aria-current={isCurrent ? "true" : undefined}
                  className={cn(
                    "-mx-2 rounded-xl px-2 py-1 transition-colors lg:-mx-3 lg:px-3",
                    isCurrent && "bg-accent-soft ring-1 ring-accent",
                  )}
                >
                  <SentenceView
                    sentence={s}
                    glossary={glossary}
                    display={display}
                    revealed={isRevealed(key)}
                    onReveal={() => reveal(key)}
                  />
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );
}
