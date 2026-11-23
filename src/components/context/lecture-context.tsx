"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  type ContextCue,
  cueIndexAt,
  type Transcript,
  transcriptCues,
} from "@/lib/context/cues";
import { usePositionOf } from "@/lib/player/clock";
import { usePlayer } from "@/lib/player/store";

interface Props {
  transcript: Transcript | null;
  /** 이 자막의 오디오(재생기에 올라 있을 때만 따라 움직인다) */
  book: string;
  item: string;
  /** 재생 화면처럼 넓은 곳에서는 크게 */
  size?: "card" | "stage";
}

/**
 * 강의 재생 중 지금 위치의 맥락(지금은 자막). 자막 파일이 없으면 아무것도 그리지 않는다.
 * 소책자 문장·해석·낱말 카드·그림 큐가 생기면 CueView에 kind별 모양을 더한다.
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
  if (cues.length === 0) return null;

  if (pos === null)
    return (
      <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-faint">
        강의를 틀면 여기에 지금 하는 말이 자막으로 따라 나옵니다.
      </p>
    );

  const at = cueIndexAt(cues, pos);
  const prev = at > 0 ? cues[at - 1] : null;
  return (
    <section
      aria-live="polite"
      className={cn(
        "rounded-2xl",
        size === "card" ? "min-h-40 bg-bg-sunken p-5" : "min-h-48",
      )}
    >
      {prev ? <CueView cue={prev} dim /> : null}
      {at >= 0 ? (
        <CueView cue={cues[at]} size={size} />
      ) : (
        <p className="text-ink-faint">…</p>
      )}
      <p className="mt-3 text-xs text-ink-faint">
        못 알아들었으면 자막을 눌러 그 말부터 다시 들으세요.
      </p>
    </section>
  );
}

function CueView({
  cue,
  dim,
  size = "card",
}: {
  cue: ContextCue;
  dim?: boolean;
  size?: "card" | "stage";
}) {
  // kind가 늘면 여기서 갈라 그린다(문장 카드·낱말 카드·그림)
  const ja = cue.lang === "ja";
  const seekTo = usePlayer((s) => s.seekTo);
  return (
    <button
      type="button"
      lang={cue.lang}
      onClick={() => seekTo(cue.start)}
      title="이 말부터 다시 듣기"
      className={cn(
        "block w-full text-left leading-relaxed active:opacity-60",
        dim
          ? "mb-3 text-sm text-ink-faint"
          : ja
            ? cn(
                "font-ja-serif text-accent",
                size === "stage" ? "text-4xl" : "text-3xl",
              )
            : size === "stage"
              ? "text-2xl"
              : "text-xl",
      )}
    >
      {cue.text}
    </button>
  );
}
