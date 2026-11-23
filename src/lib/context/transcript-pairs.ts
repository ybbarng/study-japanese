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

/**
 * 자막 구간 열에서 일본어 → 한국어 → 일본어 되풀이를 찾는다.
 * 두 일본어가 기준 이상 닮고 긍정·부정이 같아야 짝으로 본다. 짝을 만든 세 구간은 다시 쓰지 않는다.
 */
export function findRepeatPairs(
  segments: Segment[],
  minSimilarity: number = PAIR_MIN_SIMILARITY,
): TranscriptPair[] {
  const out: TranscriptPair[] = [];
  let i = 0;
  while (i + 2 < segments.length) {
    const [a, k, b] = [segments[i], segments[i + 1], segments[i + 2]];
    if (a.lang === "ja" && k.lang === "ko" && b.lang === "ja") {
      const na = normalizeJa(a.text);
      const nb = normalizeJa(b.text);
      const score = similarity(na, nb);
      if (
        [...na].length >= MIN_JA_LENGTH &&
        score >= minSimilarity &&
        compatible(na, nb) &&
        k.text.trim() !== ""
      ) {
        out.push({
          ja: betterTranscription(a.text.trim(), b.text.trim()),
          ko: k.text.trim(),
          start: a.start,
          end: b.end,
          score,
        });
        i += 3;
        continue;
      }
    }
    i++;
  }
  return out;
}
