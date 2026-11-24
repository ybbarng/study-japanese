"use client";

import { type ReactNode, useMemo } from "react";
import {
  useFollowIndex,
  useFollowScroll,
} from "@/components/context/use-follow";
import { cn } from "@/lib/cn";
import {
  conversationScripts,
  type Script,
  speakerSides,
} from "@/lib/ilmuta/conversation";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { Example, Sentence } from "@/lib/textbook/schema";
import type { StepProps } from "./lesson-types";
import { PlayCard } from "./play-card";
import { RubyText } from "./ruby-text";
import { SentenceView, useSentenceDisplay } from "./sentence-display";
import { useNowPlaying, usePlay } from "./use-player-bridge";

const AUDIO_NOTE: Partial<Record<Example["kind"], string>> = {
  conversationBasic: "천천히, 풀이와 함께",
  conversationAdvanced: "자연스러운 속도",
};

/** 회화: 말하는 사람별 말풍선. 틀면 재생 화면에도 대본이 크게 뜬다 */
export function StepConversation({ data, listens }: StepProps) {
  const { lesson, glossary } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const { display, chips, isRevealed, reveal } = useSentenceDisplay();

  return (
    <div className="space-y-6">
      {conversationScripts(lesson).map((script, si) => {
        const sides = speakerSides(script.sentences);
        return (
          <section key={script.examples[0].id} className="space-y-4">
            <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {script.examples.map((e) => (
                <PlayCard
                  key={e.id}
                  title={
                    e.kind === "conversationBasic"
                      ? "회화 Basic"
                      : "회화 Advanced"
                  }
                  note={AUDIO_NOTE[e.kind]}
                  durationSec={e.durationSec}
                  count={listens[e.id]}
                  playing={now.item === e.id && now.playing}
                  onPress={() => play([exampleTrack(lesson, e)])}
                />
              ))}
            </div>
            {si === 0 ? chips : null}
            <ScriptBubbles
              script={script}
              render={(s, i, isCurrent) => {
                const key = `${script.examples[0].id}-${i}`;
                const side = s.speaker ? sides.get(s.speaker) : "left";
                return (
                  <li
                    key={key}
                    aria-current={isCurrent ? "true" : undefined}
                    className={cn(
                      "flex flex-col",
                      side === "right" ? "items-end" : "items-start",
                    )}
                  >
                    {s.speaker ? (
                      <span
                        lang="ja"
                        className="mb-1 px-2 text-xs text-ink-faint"
                      >
                        {s.speaker}
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-3 transition-shadow lg:max-w-[75%] lg:px-6 lg:py-4",
                        side === "right"
                          ? "rounded-tr-sm bg-accent-soft"
                          : "rounded-tl-sm bg-bg-raised",
                        isCurrent && "ring-2 ring-accent",
                      )}
                    >
                      <SentenceView
                        sentence={s}
                        glossary={glossary}
                        display={display}
                        revealed={isRevealed(key)}
                        onReveal={() => reveal(key)}
                        size="md"
                      />
                    </div>
                  </li>
                );
              }}
            />
          </section>
        );
      })}

      {lesson.conversationWords?.length ? (
        <section>
          <h2 className="text-sm text-ink-faint">회화에 나온 낱말</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {lesson.conversationWords.map((w) => (
              <li
                key={w.ja}
                className="rounded-xl bg-bg-raised px-3 py-2 text-center"
              >
                <RubyText
                  text={w.ja}
                  reading={w.reading}
                  className="block text-lg leading-loose"
                />
                <span className="block text-xs text-ink-soft">{w.ko}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * 대본 말풍선 목록. 이 대본을 읽는 오디오(Basic·Advanced)를 틀면 지금 대사가 강조되고
 * 화면이 그 대사를 따라간다.
 */
function ScriptBubbles({
  script,
  render,
}: {
  script: Script;
  render: (s: Sentence, i: number, isCurrent: boolean) => ReactNode;
}) {
  const ids = script.examples.map((e) => e.id).join(",");
  const items = useMemo(() => ids.split(","), [ids]);
  const current = useFollowIndex("ilmuta", items, script.sentences);
  const id = script.examples[0].id;
  useFollowScroll(
    current >= 0 ? `${id}-${current}` : null,
    `[data-follow="${id}"] > [aria-current="true"]`,
  );
  return (
    <ol data-follow={id} className="space-y-3">
      {script.sentences.map((s, i) => render(s, i, i === current))}
    </ol>
  );
}
