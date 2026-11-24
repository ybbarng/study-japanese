"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  type ContextCue,
  cueIndexAt,
  cueText,
  type Transcript,
  transcriptCues,
} from "@/lib/context/cues";
import { usePlaybackClock, usePositionOf } from "@/lib/player/clock";
import { CueExtras, CueHeadline } from "./cue-card";
import { LoopButton } from "./loop-button";
import { useCueActions } from "./use-cue-actions";

interface Props {
  transcript: Transcript | null;
  /** 이 자막의 오디오(재생기에 올라 있을 때만 따라 움직인다) */
  book: string;
  item: string;
  /** 재생 화면처럼 넓은 곳에서는 크게 */
  size?: "card" | "stage";
}

/**
 * 강의 재생 중 지금 위치의 맥락: 지금 하는 말을 크게(소책자 문장과 맞췄으면 정확한 글·읽는 법·뜻·낱말),
 * 앞뒤 말은 흐리게. 자막 파일이 없으면 아무것도 그리지 않는다.
 */
export function LectureContext({
  transcript,
  book,
  item,
  size = "card",
}: Props) {
  const cues = useMemo(
    () => (transcript ? transcriptCues(transcript) : []),
    [transcript],
  );
  const pos = usePositionOf(book, item);
  const loopPause = usePlaybackClock((s) => s.loopPause);
  const actions = useCueActions(book, item, cues);
  if (cues.length === 0) return null;

  if (pos === null)
    return (
      <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-faint">
        강의를 틀면 여기에 지금 하는 말이 자막으로 따라 나옵니다.
      </p>
    );

  const at = cueIndexAt(cues, pos);
  // 말 없는 틈에도 바로 앞뒤 말은 보이게 한다
  const before = at >= 0 ? at : cues.findLastIndex((c) => c.start <= pos);
  const prev = before >= 0 ? cues[at >= 0 ? at - 1 : before] : null;
  const next = cues[before + 1] ?? null;
  const current = at >= 0 ? cues[at] : null;
  return (
    <section
      aria-live="polite"
      aria-label="지금 하는 말"
      className={cn(
        "rounded-2xl",
        size === "card" ? "min-h-40 bg-bg-sunken p-5" : "min-h-48",
      )}
    >
      {prev ? <Dim cue={prev} onSeek={actions.seek} /> : null}
      {current ? (
        <div data-current-cue>
          <button
            type="button"
            onClick={() => actions.seek(current)}
            title="이 말부터 다시 듣기"
            className="block w-full text-left active:opacity-60"
          >
            <CueHeadline cue={current} size={size} detail />
          </button>
          <CueExtras cue={current} />
          <div className="mt-3 flex items-center gap-3">
            <LoopButton
              active={actions.isLooping(current)}
              onClick={() => actions.toggle(current)}
            />
            {loopPause && actions.looping ? (
              <span className="animate-pulse text-accent">
                따라 말해 보세요
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="py-2 text-ink-faint">…</p>
      )}
      {next ? <Dim cue={next} onSeek={actions.seek} /> : null}
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
