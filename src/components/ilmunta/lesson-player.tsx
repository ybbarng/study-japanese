"use client";

import { useMemo, useState } from "react";
import { LectureContext } from "@/components/context/lecture-context";
import { cn } from "@/lib/cn";
import type { Transcript } from "@/lib/context/cues";
import { lessonTracks } from "@/lib/ilmunta/tracks";
import { currentTrack, usePlayer } from "@/lib/player/store";
import type { IlmuntaLesson } from "@/lib/textbook/schema";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 과 하나의 강의·예문을 사이트 재생기 대기열로 튼다. 강의를 고르면 그 강의 자막을
 * 재생 위치에 맞춰 띄운다(자막 파일이 없으면 자막 자리는 그리지 않는다).
 */
export function LessonPlayer({
  lesson,
  transcripts,
  heard,
}: {
  lesson: IlmuntaLesson;
  transcripts: Record<string, Transcript | null>;
  heard: string[];
}) {
  const tracks = useMemo(() => lessonTracks(lesson), [lesson]);
  const playing = usePlayer((s) => {
    const t = currentTrack(s);
    return t?.book === "ilmunta" && s.wantPlaying ? t.item : null;
  });
  const playQueue = usePlayer((s) => s.playQueue);
  const heardSet = new Set(heard);
  const durations = [
    ...lesson.lectures.map((l) => l.durationSec),
    ...lesson.examples.map((e) => e.durationSec),
  ];
  const withTranscript = tracks.filter((t) => transcripts[t.item]);
  const [chosen, setChosen] = useState<string | null>(null);
  // 고른 강의가 없으면 지금 재생 중인 강의, 그것도 아니면 자막 있는 첫 강의
  const shown =
    chosen ??
    (playing && transcripts[playing]
      ? playing
      : (withTranscript[0]?.item ?? null));
  const firstUnheard = Math.max(
    0,
    tracks.findIndex((t) => t.kind === "lecture" && !heardSet.has(t.item)),
  );

  return (
    <section className="flex flex-col gap-4" aria-label="강의와 예문">
      <button
        type="button"
        onClick={() => playQueue(tracks, firstUnheard)}
        className="rounded-2xl bg-accent px-5 py-4 text-left text-white active:opacity-90"
      >
        <span className="block text-lg font-bold">
          {firstUnheard > 0 ? "이어서 듣기" : "처음부터 듣기"}
        </span>
        <span className="text-sm opacity-80">
          강의 {lesson.lectures.length}개 → 예문 {lesson.examples.length}개를
          차례로
        </span>
      </button>

      <ol className="flex flex-col overflow-hidden rounded-2xl bg-bg-raised">
        {tracks.map((t, i) => {
          const isPlaying = playing === t.item;
          return (
            <li key={t.item} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => {
                  playQueue(tracks, i);
                  if (transcripts[t.item]) setChosen(t.item);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg-sunken",
                  isPlaying && "bg-accent-soft",
                )}
                aria-current={isPlaying ? "true" : undefined}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm",
                    isPlaying
                      ? "bg-accent text-white"
                      : "bg-bg-sunken text-ink-soft",
                  )}
                  aria-hidden
                >
                  {isPlaying ? "♪" : "▶"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.title}</span>
                  <span className="text-xs text-ink-faint">
                    {formatDuration(durations[i] ?? 0)}
                    {transcripts[t.item] ? " · 자막" : ""}
                  </span>
                </span>
                {heardSet.has(t.item) ? (
                  <span className="text-sm text-good">
                    <span aria-hidden>✓</span>
                    <span className="sr-only">끝까지 들음</span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {shown ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">자막 읽기</h2>
            {withTranscript.length > 1 ? (
              <div className="flex flex-wrap justify-end gap-1">
                {withTranscript.map((t) => (
                  <button
                    key={t.item}
                    type="button"
                    onClick={() => setChosen(t.item)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs",
                      shown === t.item
                        ? "bg-accent text-white"
                        : "bg-bg-raised text-ink-soft",
                    )}
                  >
                    {t.item.replace(/^L\d+-0?/, "")}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <LectureContext
            transcript={transcripts[shown] ?? null}
            book="ilmunta"
            item={shown}
          />
        </div>
      ) : null}
    </section>
  );
}
