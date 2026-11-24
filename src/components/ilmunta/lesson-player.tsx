"use client";

import { type ReactNode, useMemo, useState } from "react";
import { LectureContext } from "@/components/context/lecture-context";
import { TranscriptList } from "@/components/context/transcript-list";
import { StickyPanel } from "@/components/shell/page-frame";
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
 * 폰은 한 줄로 쌓고, PC(lg)는 왼쪽에 책 안내·트랙 목록(before·after 포함), 오른쪽 고정 곁칸에
 * 자막 전체 목록을 둔다. 종이책을 펴 놓고 옆 화면으로 강의 말을 따라 읽는 자리다.
 */
export function LessonPlayer({
  lesson,
  transcripts,
  heard,
  before,
  after,
}: {
  lesson: IlmuntaLesson;
  transcripts: Record<string, Transcript | null>;
  heard: string[];
  /** 트랙 목록 위(책 쪽수 안내 등) */
  before?: ReactNode;
  /** 트랙 목록 아래(드릴·PDF·앞뒤 과) */
  after?: ReactNode;
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
  const shownTranscript = shown ? (transcripts[shown] ?? null) : null;
  const firstUnheard = Math.max(
    0,
    tracks.findIndex((t) => t.kind === "lecture" && !heardSet.has(t.item)),
  );

  /** 자막 줄을 눌렀는데 그 강의가 소리 나고 있지 않으면: 올라 있으면 이어서, 아니면 그 강의부터 */
  const startShown = () => {
    if (!shown) return;
    const st = usePlayer.getState();
    if (currentTrack(st)?.item === shown) st.setPlaying(true);
    else
      playQueue(
        tracks,
        tracks.findIndex((t) => t.item === shown),
      );
  };

  const chooser =
    withTranscript.length > 1 ? (
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
            {/* 강의는 차례 숫자만, 예문은 "문법 예문"처럼 */}
            {t.kind === "lecture"
              ? t.item.replace(/^L\d+-0?/, "")
              : t.title.replace(/^\d+과 /, "")}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-6">
        {before}
        <section className="flex flex-col gap-4" aria-label="강의와 예문">
          <button
            type="button"
            onClick={() => playQueue(tracks, firstUnheard)}
            className="rounded-2xl bg-accent px-5 py-4 text-left text-white active:opacity-90 lg:hover:brightness-110"
          >
            <span className="block text-lg font-bold">
              {firstUnheard > 0 ? "이어서 듣기" : "처음부터 듣기"}
            </span>
            <span className="text-sm opacity-80">
              강의 {lesson.lectures.length}개 → 예문 {lesson.examples.length}
              개를 차례로
            </span>
          </button>

          <ol className="flex flex-col overflow-hidden rounded-2xl bg-bg-raised">
            {tracks.map((t, i) => {
              const isPlaying = playing === t.item;
              return (
                <li
                  key={t.item}
                  className="border-b border-line last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => {
                      // 지금 올라 있는 트랙을 다시 누르면 멈추거나 이어서 듣는다(처음으로 돌리지 않게)
                      const st = usePlayer.getState();
                      if (currentTrack(st)?.item === t.item)
                        st.setPlaying(!st.wantPlaying);
                      else playQueue(tracks, i);
                      if (transcripts[t.item]) setChosen(t.item);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg-sunken lg:hover:bg-bg-sunken",
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
                      {isPlaying ? "❚❚" : "▶"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {t.title}
                        {isPlaying ? (
                          <span className="ml-2 text-xs text-accent">
                            재생 중
                          </span>
                        ) : null}
                      </span>
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

          {/* 폰: 지금 하는 말 한 줄. PC는 오른쪽 곁칸에 자막 전체 */}
          {shown ? (
            <div className="flex flex-col gap-2 lg:hidden">
              <div className="flex items-baseline justify-between">
                <h2 className="font-medium">자막 읽기</h2>
                {chooser}
              </div>
              <LectureContext
                transcript={shownTranscript}
                book="ilmunta"
                item={shown}
              />
            </div>
          ) : null}
        </section>
        {after}
      </div>

      <aside aria-label="강의 자막" className="hidden lg:block">
        <StickyPanel>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-medium">자막 읽기</h2>
            {chooser}
          </div>
          {shown && shownTranscript ? (
            <TranscriptList
              transcript={shownTranscript}
              book="ilmunta"
              item={shown}
              onStart={startShown}
              className="min-h-0 flex-1"
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-faint">
              이 과 강의 자막은 아직 없습니다. 자막이 생기면 여기에 강의 말
              전체가 흐르고, 줄을 눌러 그 말부터 다시 들을 수 있습니다.
            </p>
          )}
        </StickyPanel>
      </aside>
    </div>
  );
}
