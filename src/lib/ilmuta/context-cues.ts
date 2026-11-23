import { z } from "zod";

// 강의 재생 화면의 "맥락": 지금 재생 위치에 맞춰 띄울 것들.
// 지금은 자막(content/transcripts/ilmuta/L01.json)만 있다. 나중에 일본어 구간에
// 소책자 문장·해석·낱말 카드·그림을 붙인 큐가 더해지면 ContextCue에 kind를 늘린다.

export const transcriptSchema = z.object({
  book: z.string(),
  item: z.string(),
  kind: z.string(),
  durationSec: z.number().nonnegative(),
  segments: z.array(
    z.object({
      start: z.number().nonnegative(),
      end: z.number().nonnegative(),
      text: z.string(),
      lang: z.enum(["ko", "ja"]),
    }),
  ),
});
export type Transcript = z.infer<typeof transcriptSchema>;

export type ContextCue = {
  kind: "subtitle";
  start: number;
  end: number;
  text: string;
  lang: "ko" | "ja";
};

/** 자막을 시작 시각 차례의 큐로 */
export function transcriptCues(t: Transcript): ContextCue[] {
  return t.segments
    .filter((s) => s.text.trim() !== "")
    .map((s) => ({
      kind: "subtitle" as const,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      lang: s.lang,
    }))
    .sort((a, b) => a.start - b.start);
}

/**
 * 시각 t에 보일 큐의 위치. 구간 사이 빈틈(말 없는 곳)에서는 바로 앞 큐를 잠깐 더 보여 준다
 * (holdSec까지). 첫 큐 전이거나 오래 비면 -1.
 */
export function cueIndexAt(
  cues: ContextCue[],
  t: number,
  holdSec = 1.5,
): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found === -1) return -1;
  return t <= cues[found].end + holdSec ? found : -1;
}
