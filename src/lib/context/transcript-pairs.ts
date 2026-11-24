import { undoubled, undoubledText } from "./align";
import { compatible, normalizeJa, similarity } from "./match";

// 일문따 문법 예문 mp3는 "일본어 → 한국어 뜻 → 같은 일본어"를 되풀이해 읽는다.
// 자막(whisper가 받아 적은 글)에서 이 모양을 찾아 일본어·뜻 짝을 만든다. 화면을 모르는 순수 함수다.
// 교재 원문이 아니라 받아 적은 글이므로, 이 짝으로 만든 카드는 출처를 transcript로 표시한다.

export interface TranscriptPair {
  /** 두 번 받아 적은 일본어 중 더 나은 쪽 */
  ja: string;
  /** 가운데 한국어 뜻 */
  ko: string;
  /** 첫 일본어 시작 ~ 둘째 일본어 끝(초) */
  start: number;
  end: number;
  /** 두 일본어가 닮은 정도(0~1) */
  score: number;
}

/**
 * 두 번 받아 적은 일본어를 같은 문장으로 볼 닮은 정도.
 * 일문따 예문 자막 54개에서 ja→ko→ja 모양 889개를 재 보니 0.8 이상 686개,
 * 0.8 밑에서는 한쪽이 잘리거나 다른 문장이 붙은 경우가 섞인다(docs/plan.md C).
 */
export const PAIR_MIN_SIMILARITY = 0.8;

/** 짝으로 쓸 일본어의 최소 길이(비교용 글 기준). 두 글자 이하는 맞장구·숫자가 많다 */
const MIN_JA_LENGTH = 3;

const KANJI = /[㐀-鿿豈-﫿々]/gu;
/** 일본어 문장에 섞이면 잘못 받아 적은 것: 한글·로마자 */
const FOREIGN = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-zＡ-Ｚａ-ｚ]/gu;

function count(s: string, re: RegExp): number {
  return s.match(re)?.length ?? 0;
}

/**
 * 같은 문장을 두 번 받아 적은 글 중 더 나은 쪽.
 * ① 한글·로마자가 덜 섞인 쪽 ② 한자가 더 많은 쪽(교재는 기초 낱말을 한자로 적는다,
 * whisper는 가나로 풀어 적기도 한다) ③ 더 긴 쪽(끝이 잘리기도 한다). 모두 같으면 앞의 것.
 */
export function betterTranscription(a: string, b: string): string {
  const fa = count(a, FOREIGN);
  const fb = count(b, FOREIGN);
  if (fa !== fb) return fa < fb ? a : b;
  const ka = count(a, KANJI);
  const kb = count(b, KANJI);
  if (ka !== kb) return ka > kb ? a : b;
  const la = [...normalizeJa(a)].length;
  const lb = [...normalizeJa(b)].length;
  return lb > la ? b : a;
}

type Segment = { start: number; end: number; text: string; lang: "ko" | "ja" };

/** 두 일본어 사이에 낄 수 있는 한국어 줄 수(뜻을 두 번 읽거나 "어?" 같은 소리가 끼기도 한다) */
const MAX_KO_BETWEEN = 3;

export interface RepeatPairOptions {
  /** 두 일본어를 같은 문장으로 볼 닮은 정도 */
  minSimilarity?: number;
  /** 한자를 읽는 법으로 푸는 함수 */
  toKana?: (text: string) => string;
  /**
   * 사이 한국어 줄을 뜻으로 쓸지. 강의처럼 사이 말이 설명일 수 있으면 false(뜻을 비운다)나,
   * 일본어·한국어 줄을 받아 뜻으로 볼 만한지 가르는 함수
   */
  koIsMeaning?: boolean | ((ja: string, ko: string) => boolean);
}

/** i부터 일본어 줄 하나나, 바로 이어진 일본어 줄 둘(한 문장이 두 줄로 나뉨) */
function jaRuns(
  segments: Segment[],
  i: number,
): { text: string; end: number }[] {
  const a = segments[i];
  if (a?.lang !== "ja") return [];
  const out = [{ text: a.text, end: i }];
  const b = segments[i + 1];
  if (b?.lang === "ja") out.push({ text: `${a.text}${b.text}`, end: i + 1 });
  return out;
}

/** 사이 한국어 줄 가운데 뜻으로 쓸 것: 가장 긴 줄(같은 뜻을 두 번 읽거나 짧은 감탄이 끼어도) */
function meaningOf(between: Segment[]): string {
  return between
    .map((s) => s.text.trim())
    .reduce((best, t) => (t.length > best.length ? t : best), "");
}

/**
 * 자막 구간 열에서 일본어 → 한국어 → 일본어 되풀이를 찾는다.
 * 사이 한국어 줄은 셋까지, 일본어는 한 문장이 두 줄로 나뉜 것도 이어서 견준다.
 * 두 일본어가 기준 이상 닮고 긍정·부정이 같아야 짝으로 본다. 짝을 만든 구간은 다시 쓰지 않는다.
 * 한 번은 한자로, 한 번은 가나로 받아 적기도 해서(果物/くだもの) toKana로 푼 글끼리도 견준다.
 * 한 줄에 같은 문장을 두 번 받아 적은 것(「AA」)은 한 번으로 본다.
 */
export function findRepeatPairs(
  segments: Segment[],
  minSimilarityOrOptions: number | RepeatPairOptions = PAIR_MIN_SIMILARITY,
  toKanaArg: (text: string) => string = (t) => t,
): TranscriptPair[] {
  const opts: RepeatPairOptions =
    typeof minSimilarityOrOptions === "number"
      ? { minSimilarity: minSimilarityOrOptions, toKana: toKanaArg }
      : minSimilarityOrOptions;
  const minSimilarity = opts.minSimilarity ?? PAIR_MIN_SIMILARITY;
  const toKana = opts.toKana ?? ((t: string) => t);
  const koIsMeaning = opts.koIsMeaning ?? true;
  const out: TranscriptPair[] = [];
  let i = 0;
  while (i < segments.length) {
    let found: { pair: TranscriptPair; next: number } | null = null;
    for (const a of jaRuns(segments, i)) {
      // 사이 한국어 줄들
      let j = a.end + 1;
      const between: Segment[] = [];
      while (
        j < segments.length &&
        segments[j].lang === "ko" &&
        between.length < MAX_KO_BETWEEN
      )
        between.push(segments[j++]);
      if (between.length === 0 || meaningOf(between) === "") continue;
      const na = undoubled(normalizeJa(a.text));
      if ([...na].length < MIN_JA_LENGTH) continue;
      for (const b of jaRuns(segments, j)) {
        const nb = undoubled(normalizeJa(b.text));
        const score = Math.max(
          similarity(na, nb),
          similarity(
            undoubled(normalizeJa(toKana(a.text))),
            undoubled(normalizeJa(toKana(b.text))),
          ),
        );
        if (score < minSimilarity || !compatible(na, nb)) continue;
        if (found && score <= found.pair.score) continue;
        const ja = betterTranscription(
          undoubledText(a.text),
          undoubledText(b.text),
        );
        const ko = meaningOf(between);
        const keep =
          typeof koIsMeaning === "function" ? koIsMeaning(ja, ko) : koIsMeaning;
        found = {
          pair: {
            ja,
            ko: keep ? ko : "",
            start: segments[i].start,
            end: segments[b.end].end,
            score,
          },
          next: b.end + 1,
        };
      }
    }
    if (found) {
      out.push(found.pair);
      i = found.next;
    } else i++;
  }
  return out;
}
