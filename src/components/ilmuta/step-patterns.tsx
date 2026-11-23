"use client";

import { KIND_LABEL } from "@/lib/ilmuta/labels";
import { groupByPattern } from "@/lib/ilmuta/patterns";
import { examplesOf } from "@/lib/ilmuta/steps";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { StepProps } from "./lesson-types";
import { PlayCard } from "./play-card";
import { SentenceView, useSentenceDisplay } from "./sentence-display";
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
          {groupByPattern(example).map((g) => (
            <article
              key={g.head?.no ?? `loose`}
              className="rounded-2xl bg-bg-raised p-4"
            >
              {g.head ? (
                <header className="border-b border-line pb-3">
                  <p className="text-xs text-accent">문형 {g.head.no}</p>
                  <p lang="ja" className="mt-1 font-ja-serif text-2xl">
                    {g.head.ja}
                  </p>
                  <p className="text-sm text-ink-soft">{g.head.ko}</p>
                </header>
              ) : null}
              <ul className="mt-3 space-y-4">
                {g.sentences.map((s, i) => {
                  const key = `${example.id}-${g.head?.no ?? 0}-${i}`;
                  return (
                    <li key={key}>
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
        </section>
      ))}
    </div>
  );
}
