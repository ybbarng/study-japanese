"use client";

import { type ReactNode, useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  type ContextCue,
  cueText,
  type Transcript,
  transcriptCues,
} from "@/lib/context/cues";
import { usePlaybackClock, usePositionOf } from "@/lib/player/clock";
import { stageView } from "@/lib/player/follow";
import { CueExtras, CueHeadline } from "./cue-card";
import { LoopButton } from "./loop-button";
import { useCueActions } from "./use-cue-actions";

interface Props {
  transcript: Transcript | null;
  /** 이 자막의 오디오(재생기에 올라 있을 때만 따라 움직인다) */
  book: string;
  item: string;
  /** 폰 카드는 card, PC 가운데 칸처럼 넓은 곳은 stage */
  size?: "card" | "stage";
  /** 맨 위에 붙일 머리(지금 무엇을 듣는지) */
  heading?: ReactNode;
  /** 아직 이 오디오가 재생기에 없을 때 보일 안내 */
  idle?: string;
  className?: string;
}

/**
 * 재생 중 지금 위치의 맥락. 일본어 줄은 크게(소책자 문장과 맞췄으면 정확한 글·읽는 법·뜻·낱말)
 * 보이고, 강사가 한국어로 풀이하는 동안에도 다음 일본어 줄이 나올 때까지 남겨 읽을 시간을 준다.
 * 지금 하는 한국어 말과 앞뒤 말은 그 아래에 작게. 자막 파일이 없으면 아무것도 그리지 않는다.
 */
export function LectureContext({
  transcript,
  book,
  item,
  size = "card",
  heading,
  idle = "강의를 틀면 여기에 지금 하는 말이 자막으로 따라 나옵니다.",
  className,
}: Props) {
  const cues = useMemo(
    () => (transcript ? transcriptCues(transcript) : []),
    [transcript],
  );
  const pos = usePositionOf(book, item);
  const loopPause = usePlaybackClock((s) => s.loopPause);
  const actions = useCueActions(book, item, cues);
  if (cues.length === 0) return null;

  const frame = cn(
    "rounded-2xl",
    size === "card" ? "bg-bg-sunken p-5" : "bg-bg-sunken p-6 xl:p-8",
    className,
  );

  if (pos === null)
    return (
      <section aria-label="지금 하는 말" className={frame}>
        {heading}
        <p className="text-sm text-ink-faint">{idle}</p>
      </section>
    );

  const view = stageView(cues, pos);
  const current = view.at >= 0 ? cues[view.at] : null;
  // 지금 줄이 일본어면 그 줄이 큰 칸의 주인공, 한국어 풀이 중이면 방금 나온 일본어 줄을 붙든다
  const held = view.held >= 0 ? cues[view.held] : null;
  const heldIsCurrent = view.held === view.at;
  const focus = held ?? current;
  const prev =
    view.prev >= 0 && view.prev !== view.held ? cues[view.prev] : null;
  const next = view.next >= 0 ? cues[view.next] : null;
  // 반복 단추는 크게 보이는 줄(붙든 일본어 줄, 없으면 지금 줄) 바로 아래에
  const loopRow = focus ? (
    <div className="mt-3 flex items-center gap-3">
      <LoopButton
        active={actions.isLooping(focus)}
        onClick={() => actions.toggle(focus)}
      />
      {loopPause && actions.looping ? (
        <span className="animate-pulse text-accent">따라 말해 보세요</span>
      ) : null}
    </div>
  ) : null;

  return (
    <section aria-live="polite" aria-label="지금 하는 말" className={frame}>
      {heading}
      {held ? (
        <div
          data-held-cue
          data-current-cue={heldIsCurrent ? "" : undefined}
          className={cn(!heldIsCurrent && "opacity-90")}
        >
          <p className="mb-1 text-xs text-ink-faint">
            {heldIsCurrent ? "지금 일본어" : "방금 나온 일본어"}
          </p>
          <button
            type="button"
            onClick={() => actions.seek(held)}
            title="이 말부터 다시 듣기"
            className="block w-full text-left active:opacity-60"
          >
            <CueHeadline cue={held} size={size} detail />
          </button>
          <CueExtras cue={held} />
        </div>
      ) : null}

      {held ? loopRow : null}

      <div
        className={cn(
          held && "mt-4 border-t border-line pt-3",
          size === "stage" && "min-h-[7.5rem]",
        )}
      >
        {prev ? <Dim cue={prev} onSeek={actions.seek} /> : null}
        {current && !heldIsCurrent ? (
          <button
            type="button"
            data-current-cue
            onClick={() => actions.seek(current)}
            title="이 말부터 다시 듣기"
            className="block w-full text-left active:opacity-60"
          >
            <CueHeadline
              cue={current}
              size={held ? (size === "stage" ? "card" : "list") : size}
              detail
            />
          </button>
        ) : !current ? (
          <p className="py-1 text-ink-faint">…</p>
        ) : null}
        {current && !heldIsCurrent ? <CueExtras cue={current} /> : null}
        {held ? null : loopRow}
        {next ? <Dim cue={next} onSeek={actions.seek} /> : null}
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        못 알아들었으면 자막을 눌러 그 말부터 다시 들으세요.
      </p>
    </section>
  );
}

function Dim({
  cue,
  onSeek,
}: {
  cue: ContextCue;
  onSeek: (cue: ContextCue) => void;
}) {
  return (
    <button
      type="button"
      lang={cue.lang}
      onClick={() => onSeek(cue)}
      title="이 말부터 다시 듣기"
      className="my-2 block w-full truncate text-left text-sm text-ink-faint active:opacity-60"
    >
      {cueText(cue)}
    </button>
  );
}
