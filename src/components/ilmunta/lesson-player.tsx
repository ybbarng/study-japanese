"use client";

import { type ReactNode, useMemo, useState } from "react";
import { LectureContext } from "@/components/context/lecture-context";
import { TranscriptList } from "@/components/context/transcript-list";
import { InlinePlayer } from "@/components/player/inline-player";
import { StickyPanel } from "@/components/shell/page-frame";
import { WordTapProvider } from "@/components/word-tap/word-tap-provider";
import { cn } from "@/lib/cn";
import type { Transcript } from "@/lib/context/cues";
import { lessonTracks } from "@/lib/ilmunta/tracks";
import { currentTrack, usePlayer } from "@/lib/player/store";
import type { IlmuntaLesson } from "@/lib/textbook/schema";
import { emptyWordTap } from "@/lib/word-tap/types";

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
  const wordTap = useMemo(() => emptyWordTap(lesson.no, "ilmunta"), [lesson]);
  const playing = usePlayer((s) => {
    const t = currentTrack(s);
    return t?.book === "ilmunta" && s.wantPlaying ? t.item : null;
  });
  // 멈춰 있어도 재생기에 올라 있는 이 과 트랙(지금 하는 말 칸이 따라간다)
  const loaded = usePlayer((s) => {
    const t = currentTrack(s);
    return t?.book === "ilmunta" ? t.item : null;
  });
  const playQueue = usePlayer((s) => s.playQueue);
  const heardSet = new Set(heard);
  const durations = [
    ...lesson.lectures.map((l) => l.durationSec),
    ...lesson.examples.map((e) => e.durationSec),
  ];
  const withTranscript = tracks.filter((t) => transcripts[t.item]);
  const [chosen, setChosen] = useState<string | null>(null);
  // 재생이 다음 트랙으로 넘어가면(강의 1/5 → 2/5 등) 자막도 지금 소리 나는 트랙을 따라간다
  const [lastPlaying, setLastPlaying] = useState(playing);
  if (playing !== lastPlaying) {
    setLastPlaying(playing);
    if (playing && transcripts[playing]) setChosen(null);
  }
  // 고른 강의가 없으면 지금 재생 중인 트랙, 멈췄으면 재생기에 올라 있는 트랙(멈춰도 그 자막을 두고 읽는다),
  // 그것도 아니면 자막 있는 첫 강의
  const onPlayer = playing ?? loaded;
  const shown =
    chosen ??
    (onPlayer && transcripts[onPlayer]
      ? onPlayer
      : (withTranscript[0]?.item ?? null));
  const shownTranscript = shown ? (transcripts[shown] ?? null) : null;
  const firstUnheard = Math.max(
    0,
    tracks.findIndex((t) => t.kind === "lecture" && !heardSet.has(t.item)),
  );

  // 재생기에 아무것도 없을 때 큰 단추: 아직 안 들은 강의부터 차례로
  const idle = {
    label: "이 과 듣기",
    onStart: () => playQueue(tracks, firstUnheard),
  };

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
      <div className="flex min-w-0 flex-wrap justify-end gap-1">
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
    // 낱말 칩을 누르면 낱말 정보 창이 열린다(일문따는 분석 파일이 없어 칩 단위로만)
    <WordTapProvider data={wordTap}>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          {/* 폰: 재생기를 화면 위에 붙인다(내려 읽으면 한 줄로 접힌다). PC는 오른쪽 칸 맨 위 */}
          <div className="contents lg:hidden">
            <InlinePlayer
              variant="top"
              idle={idle}
              collapsedChildren={
                shown && loaded === shown ? (
                  <LectureContext
                    key={`lines-${shown}`}
                    transcript={shownTranscript}
                    book="ilmunta"
                    item={shown}
                    lines
                    className="mt-1.5"
                  />
                ) : null
              }
            >
              {shown && loaded === shown ? (
                <LectureContext
                  key={shown}
                  transcript={shownTranscript}
                  book="ilmunta"
                  item={shown}
                  compact
                  className="mt-2"
                />
              ) : null}
            </InlinePlayer>
          </div>
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
          </section>
          {after}
        </div>

        <aside aria-label="강의 자막" className="hidden lg:block">
          <StickyPanel className="max-h-[calc(100dvh-4rem)]">
            <InlinePlayer variant="panel" idle={idle} />
            {shown && loaded === shown ? (
              <LectureContext
                key={`ctx-${shown}`}
                transcript={shownTranscript}
                book="ilmunta"
                item={shown}
                className="shrink-0"
              />
            ) : null}
            {/* 강의 칩이 많아도 제목이 한 글자 폭으로 눌리지 않게: 제목은 줄바꿈 없이 두고 칩 줄이 남은 폭을 쓴다 */}
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="shrink-0 whitespace-nowrap font-medium">
                자막 읽기
              </h2>
              {chooser}
            </div>
            {shown && shownTranscript ? (
              <TranscriptList
                transcript={shownTranscript}
                book="ilmunta"
                item={shown}
                onStart={startShown}
                // 이 강의가 재생기에 올라 있으면 위 칸이 지금 하는 말을 펼쳐 보이니 목록은 지금 줄만 강조한다
                expand={loaded !== shown}
                className="min-h-40 flex-1"
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
    </WordTapProvider>
  );
}
