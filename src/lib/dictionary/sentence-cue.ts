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

/** 앞뒤 자리 경계를 비교할 때 받아 적은 시각의 흔들림 */
const EDGE_SLACK_SEC = 0.05;

/**
 * 한 예문의 문장마다 자리를 찾는다. 글로 못 찾은 문장은 같은 화자의 앞뒤 문장이 잡힌 자리 사이에서
 * 찾는다. 회화 mp3는 역할 연습처럼 한 화자의 말만 이어 읽기도 해서(앞 절반 A, 뒤 절반 B) 같은 화자끼리
 * 본다. 짧은 대답을 한국어 낱말로 잘못 받아 적으면 글로는 못 찾지만, 그 문장은 앞뒤 문장 사이 줄에 있다.
 * 다른 문장이 이미 잡은 줄은 사이 줄에서 뺀다(보통 회화에서 다른 화자의 말을 잡지 않게).
 * 사이 줄이 못 찾은 문장 수보다 적으면 어느 줄인지 모르므로 null로 둔다.
 * 화자가 없는 예문(문형·낱말)은 채우지 않는다. "일본어 → 뜻 → 일본어"를 되풀이해서 사이 첫 줄이
 * 앞 문장의 뜻 풀이일 때가 많다.
 */
export function findExampleCues(
  cues: readonly ContextCue[],
  segments: readonly CueSegment[],
  sentences: readonly { ja: string; speaker?: string }[],
): (Span | null)[] {
  const found = sentences.map((s) => findExampleCue(cues, segments, s.ja));
  return found.map(
    (span, i) => span ?? betweenSameSpeaker(found, segments, sentences, i),
  );
}

function betweenSameSpeaker(
  found: readonly (Span | null)[],
  segments: readonly CueSegment[],
  sentences: readonly { speaker?: string }[],
  i: number,
): Span | null {
  if (sentences[i].speaker === undefined) return null;
  const same = (j: number) => sentences[j].speaker === sentences[i].speaker;
  let before = -1;
  for (let j = i - 1; j >= 0 && before < 0; j--)
    if (same(j) && found[j]) before = j;
  let after = -1;
  for (let j = i + 1; j < sentences.length && after < 0; j++)
    if (same(j) && found[j]) after = j;
  if (before < 0 || after < 0) return null;
  const from = (found[before] as Span).end;
  const to = (found[after] as Span).start;
  if (from > to) return null;
  // 두 문장 사이에서 자리를 못 찾은 같은 화자 문장들(이 문장이 그 가운데 몇째인지)
  const missing: number[] = [];
  for (let j = before + 1; j < after; j++)
    if (same(j) && !found[j]) missing.push(j);
  const taken = (s: CueSegment) =>
    found.some((f) => f && s.start < f.end && s.end > f.start);
  const gap = segments.filter(
    (s) =>
      s.start >= from - EDGE_SLACK_SEC &&
      s.end <= to + EDGE_SLACK_SEC &&
      !taken(s),
  );
  if (gap.length < missing.length) return null;
  const seg = gap[missing.indexOf(i)];
  return { start: seg.start, end: seg.end };
}
