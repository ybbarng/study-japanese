"use client";

import {
  playClip,
  useClipPlaying,
  useStopClipOnUnmount,
} from "@/components/quiz/clip-player";
import { SpeakButton } from "@/components/speech/speak-button";
import { cn } from "@/lib/cn";
import type { DictExample } from "@/lib/dictionary/server";
import { pickWordClip } from "@/lib/dictionary/word-sound";

/**
 * 낱말 듣기. 교재 목소리(단어 카드나 그 낱말이 든 짧은 예문 구간)를 먼저 틀고,
 * 그 구간이 낱말만 읽는 것이 아니면 기기 음성으로 낱말만 읽는 단추를 함께 둔다.
 */
export function WordSound({
  word,
  reading,
  examples,
}: {
  word: string;
  reading: string;
  examples: DictExample[];
}) {
  const clip = pickWordClip(examples);
  const playing = useClipPlaying();
  useStopClipOnUnmount();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {clip?.cue ? (
        <span className="inline-flex items-center gap-2">
          <button
            type="button"
            aria-label={
              clip.wordCard ? "낱말 듣기(교재 소리)" : "낱말 듣기(교재 문장 속)"
            }
            onClick={() => {
              if (clip.cue) playClip(clip.track.src, clip.cue);
            }}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent transition active:scale-95",
              playing && "bg-accent text-white",
            )}
          >
            ▶
          </button>
          <span className="text-xs text-ink-faint">
            {clip.wordCard
              ? `교재 소리 · 일무따 ${clip.lessonLabel} 단어`
              : `교재 소리 · 이 낱말이 든 예문(일무따 ${clip.lessonLabel})`}
          </span>
        </span>
      ) : null}
      {clip?.wordCard ? null : (
        <SpeakButton text={word} kana={reading} label="낱말 듣기(기계 음성)" />
      )}
    </div>
  );
}
