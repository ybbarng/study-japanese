import { type Transcript, transcriptCues } from "@/lib/context/cues";
import { sentenceTimeline } from "@/lib/player/follow";
import type { ClipRef } from "./types";

// 소리 문제·다시 듣기가 틀 구간. 예문 자막에서 서버가 소책자 문장과 맞춘 줄의 시각을 쓴다.

export interface Span {
  start: number;
  end: number;
}

/** 문장 앞뒤로 조금 여유를 둔다(자막 시각이 소리보다 살짝 늦거나 이르게 잡혀 첫 소리가 잘리지 않게) */
export const CLIP_PAD = { before: 0.15, after: 0.3 } as const;

/** 예문 하나의 문장 차례 → 처음 소리 나는 구간 */
export function clipSpans(
  transcript: Transcript,
  sentences: { ja: string }[],
): Map<number, Span> {
  const spans = new Map<number, Span>();
  for (const t of sentenceTimeline(transcriptCues(transcript), sentences))
    if (!spans.has(t.index) && t.end > t.start)
      spans.set(t.index, {
        start: Math.max(0, t.start - CLIP_PAD.before),
        end: t.end + CLIP_PAD.after,
      });
  return spans;
}

/** 예문 id → 문장 차례 → 구간 */
export type ClipIndex = ReadonlyMap<string, ReadonlyMap<number, Span>>;

export function spanOf(index: ClipIndex, clip: ClipRef): Span | undefined {
  return index.get(clip.item)?.get(clip.index);
}
