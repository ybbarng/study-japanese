import type { ContextCue } from "@/lib/context/cues";
import {
  compatible,
  normalizeJa,
  similarity,
  splitSentences,
  thresholdFor,
} from "@/lib/context/match";

// 예문 mp3 자막(받아 적은 글)에서 교재 문장이 읽히는 구간을 찾는다. 사전의 "이 예문 듣기"가
// 예문 mp3를 그 문장 자리부터 틀 때 쓴다. 못 찾으면 null(처음부터 튼다).

export interface CueSegment {
  start: number;
  end: number;
  text: string;
  lang: "ko" | "ja";
}

type Span = { start: number; end: number };

/**
 * 받아 적은 글로 직접 찾는다. 한 구간이 문장과 비슷하거나, 받아 적기가 문장 하나를 두 구간으로
 * 나눠 적었으면 이어 붙인 두 구간이 비슷한 곳.
 */
export function findSentenceCue(
  segments: readonly CueSegment[],
  ja: string,
): Span | null {
  const want = normalizeJa(ja);
  if (want === "") return null;
  const need = thresholdFor([...want].length);
  const like = (text: string) =>
    [text, ...splitSentences(text)]
      .map(normalizeJa)
      .some((p) => similarity(p, want) >= need && compatible(p, want));
  for (const seg of segments) {
    if (seg.lang === "ja" && like(seg.text))
      return { start: seg.start, end: seg.end };
  }
  for (let i = 0; i + 1 < segments.length; i++) {
    const a = segments[i];
    const b = segments[i + 1];
    if (a.lang !== "ja" || b.lang !== "ja") continue;
    if (like(a.text + b.text)) return { start: a.start, end: b.end };
  }
  return null;
}

/**
 * 서버가 자막에 붙인 맥락 카드에서 먼저 찾는다(자막 짝짓기가 나아지면 저절로 더 찾는다).
 * 카드가 그 문장을 품은 첫 구간을 쓰고, 없으면 받아 적은 글로 직접 찾는다.
 */
export function findExampleCue(
  cues: readonly ContextCue[],
  segments: readonly CueSegment[],
  ja: string,
): Span | null {
  const want = normalizeJa(ja);
  if (want === "") return null;
  const carded = cues.find((c) =>
    c.card?.sentences.some((s) => normalizeJa(s.ja) === want),
  );
  if (carded) return { start: carded.start, end: carded.end };
  return findSentenceCue(segments, ja);
}
