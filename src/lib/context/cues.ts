import { z } from "zod";
import { type CueCard, cueCardSchema } from "./cards";

// 강의 재생 화면의 "맥락": 지금 재생 위치에 맞춰 띄울 것들. 일무따·일문따가 함께 쓴다.
// 자막(content/transcripts/<book>/<item>.json)에, 서버가 일본어 구간마다 맞춘 소책자 문장·낱말
// 카드(cards.ts)를 붙여 내준다. 카드가 없는 구간은 자막만 보인다.

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
  /** segments 차례(문자열) → 그 구간의 맥락 카드. 서버가 붙인다 */
  cards: z.record(z.string(), cueCardSchema).optional(),
});
export type Transcript = z.infer<typeof transcriptSchema>;

export type ContextCue = {
  kind: "subtitle";
  start: number;
  end: number;
  text: string;
  lang: "ko" | "ja";
  /** 맞춘 소책자 문장·낱말(있을 때만) */
  card?: CueCard;
};

/** 자막을 시작 시각 차례의 큐로 */
export function transcriptCues(t: Transcript): ContextCue[] {
  return t.segments
    .map((s, i): ContextCue | null => {
      const text = s.text.trim();
      if (text === "") return null;
      const card = t.cards?.[String(i)];
      return {
        kind: "subtitle",
        start: s.start,
        end: s.end,
        text,
        lang: s.lang,
        ...(card ? { card } : {}),
      };
    })
    .filter((c): c is ContextCue => c !== null)
    .sort((a, b) => a.start - b.start);
}

/** 화면에 보일 글: 구간 전체를 소책자 문장과 맞췄으면 정확한 소책자 글, 아니면 받아 적은 자막 */
export function cueText(cue: ContextCue): string {
  if (cue.card?.whole && cue.card.sentences.length > 0)
    return cue.card.sentences.map((s) => s.ja).join(" ");
  return cue.text;
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

/**
 * 시각 t에 가장 가까운 지난 큐(빈틈이 길어도). 문장 반복을 걸 때 "방금 들은 문장"을 고른다.
 */
export function cueIndexBefore(cues: ContextCue[], t: number): number {
  return cueIndexAt(cues, t, Number.POSITIVE_INFINITY);
}
