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

export function findSentenceCue(
  segments: readonly CueSegment[],
  ja: string,
): { start: number; end: number } | null {
  const want = normalizeJa(ja);
  if (want === "") return null;
  const need = thresholdFor([...want].length);
  for (const seg of segments) {
    if (seg.lang !== "ja") continue;
    const pieces = [seg.text, ...splitSentences(seg.text)].map(normalizeJa);
    if (pieces.some((p) => similarity(p, want) >= need && compatible(p, want)))
      return { start: seg.start, end: seg.end };
  }
  return null;
}
