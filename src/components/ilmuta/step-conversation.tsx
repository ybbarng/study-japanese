"use client";

import { ScenePicture } from "@/components/pictures/scene-picture";
import { WordPicture } from "@/components/pictures/word-picture";
import { cn } from "@/lib/cn";
import { conversationScripts, speakerSides } from "@/lib/ilmuta/conversation";
import { exampleTrack } from "@/lib/ilmuta/tracks";
import type { Example } from "@/lib/textbook/schema";
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
      <ScenePicture
        book="ilmuta"
        lessonNo={lesson.no}
        className="mx-auto max-w-md lg:max-w-lg"
      />
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
            <ol className="space-y-3">
              {script.sentences.map((s, i) => {
                const key = `${script.examples[0].id}-${i}`;
                const side = s.speaker ? sides.get(s.speaker) : "left";
                return (
                  <li
                    key={key}
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
                        "max-w-[85%] rounded-2xl px-4 py-3 lg:max-w-[75%] lg:px-6 lg:py-4",
                        side === "right"
                          ? "rounded-tr-sm bg-accent-soft"
                          : "rounded-tl-sm bg-bg-raised",
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
              })}
            </ol>
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
                <WordPicture ja={w.ja} size={40} className="mx-auto block" />
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
