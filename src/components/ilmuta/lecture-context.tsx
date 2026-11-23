"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import {
  type ContextCue,
  cueIndexAt,
  type Transcript,
  transcriptCues,
} from "@/lib/ilmuta/context-cues";
import { usePlaybackTime } from "./use-player-bridge";

interface Props {
  transcript: Transcript | null;
  /** 이 강의가 지금 재생기에 올라 있는지 */
  active: boolean;
}

/**
 * 강의 재생 중 지금 위치의 맥락(지금은 자막). 자막 파일이 없으면 아무것도 그리지 않는다.
 * 소책자 문장·해석·낱말 카드·그림 큐가 생기면 CueView에 kind별 모양을 더한다.
 */
export function LectureContext({ transcript, active }: Props) {
  const cues = useMemo(
    () => (transcript ? transcriptCues(transcript) : []),
    [transcript],
  );
  const time = usePlaybackTime(active && cues.length > 0);
  if (cues.length === 0) return null;

  if (!active)
    return (
      <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-faint">
        강의를 틀면 여기에 지금 하는 말이 자막으로 따라 나옵니다.
      </p>
    );

  const at = cueIndexAt(cues, time);
  const prev = at > 0 ? cues[at - 1] : null;
  return (
    <section
      aria-live="polite"
      className="min-h-40 rounded-2xl bg-bg-sunken p-5"
    >
      {prev ? <CueView cue={prev} dim /> : null}
      {at >= 0 ? (
        <CueView cue={cues[at]} />
      ) : (
        <p className="text-ink-faint">…</p>
      )}
    </section>
  );
}

function CueView({ cue, dim }: { cue: ContextCue; dim?: boolean }) {
  // kind가 늘면 여기서 갈라 그린다(문장 카드·낱말 카드·그림)
  const ja = cue.lang === "ja";
  return (
    <p
      lang={cue.lang}
      className={cn(
        "leading-relaxed",
        dim
          ? "mb-3 text-sm text-ink-faint"
          : ja
            ? "font-ja-serif text-3xl text-accent"
            : "text-xl",
      )}
    >
      {cue.text}
    </p>
  );
}
