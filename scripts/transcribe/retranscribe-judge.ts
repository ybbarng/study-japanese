/**
 * 다시 받아 적은 일본어 구간이 원래보다 나은지 가린다. 파일·도구를 모르는 순수 함수다.
 *
 * 받아쓰기 둘을 받는다: 그 강·과 낱말을 initial prompt로 넣은 것(prompted)과 넣지 않은 것(plain).
 * 둘 다 빔 검색·온전한 오디오 창으로 돌렸다(처음 받아쓰기는 창을 줄이고 언어 감지를 거쳤다).
 *
 * 바꾸는 경우는 둘뿐이다.
 * ① matched: 새 글로 바꾸면 그 구간이 교재 문장과 통째로 맞고, 파일 전체의 맞춤 수가 줄지 않는다.
 *    prompt에 넣은 문장을 소리 없이 베껴 쓴 것을 막으려고, 새 글이 다른 받아쓰기(plain 또는 원래)와도
 *    어느 정도 닮아야 한다(소리가 뒷받침한다).
 * ② agreed: 맞춤은 없지만 prompted·plain 두 받아쓰기가 글자까지 같고, 원래 글만 동떨어졌다
 *    (가타카나투성이 글은 한국어를 잘못 들은 것이라 받지 않는다). 강의에서는 쓰지 않는다.
 * ③ kanji: 읽기는 원래와 같고, 두 받아쓰기가 똑같이 한자를 더 써서 적었다(표기만 고친다).
 * 어느 쪽이든 먼저 안전 검사(환각 문구·되풀이·한글 섞임·길이)를 통과해야 한다.
 */
import { normalizeJa, similarity } from "@/lib/context/match";
import { isNoiseLine, isSuspectText } from "@/lib/transcript/hallucination";

/** 일본어 글자(가나·한자) */
const JA_CHAR = /[ぁ-ゖァ-ヺ\p{Script=Han}]/u;
/** 일본어 받아쓰기에 섞이면 잘못 들은 것: 한글·로마자 */
const FOREIGN = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-zＡ-Ｚａ-ｚ]/gu;
const HANGUL = /[가-힣]/u;

function foreignCount(s: string): number {
  return s.match(FOREIGN)?.length ?? 0;
}

function kanjiCount(s: string): number {
  return s.match(/\p{Script=Han}/gu)?.length ?? 0;
}

/** 새 글 길이가 원래의 이 배수 안이어야 한다(가나로 푼 비교용 글 기준) */
export const LENGTH_RATIO = { min: 0.5, max: 2 };
/** 초당 가나 수 상한(빠른 말도 이보다 많이 말하지 못한다) */
export const MAX_KANA_PER_SEC = 14;
/** matched: 새 글이 다른 받아쓰기 하나와 이만큼은 닮아야 한다 */
export const SUPPORT_SIMILARITY = 0.5;
/** agreed: 두 새 받아쓰기는 글자까지 같고, 원래 글과의 닮음은 1에서 이만큼 모자라야 한다 */
export const AGREE_MARGIN = 0.15;
/**
 * agreed: 가나·한자 중 가타카나가 이 비율을 넘으면 받지 않는다.
 * 강의에서 한국어 말을 일본어로 잘못 들으면 두 받아쓰기 모두 비슷한 엉터리 가타카나가 된다.
 * 일무따 강의·예문 88개 파일에서 재 보니, 이 조건과 글자 일치를 더하면 교재 문장에서 멀어진 바꿈이
 * 12/105에서 4/74로 줄었다.
 */
export const MAX_KATAKANA_SHARE = 0.5;

function katakanaShare(s: string): number {
  const ja = s.match(/[ぁ-ゖァ-ヺー\p{Script=Han}]/gu)?.length ?? 0;
  const kata = s.match(/[ァ-ヺー]/g)?.length ?? 0;
  return ja === 0 ? 1 : kata / ja;
}

export type Decodes = {
  original: string;
  prompted: string | null;
  plain: string | null;
  /** 구간 길이(초) */
  durationSec: number;
  /**
   * 강의처럼 한국어 설명 사이에 일본어가 끼는 오디오. 한국어 말소리를 일본어로 잘못 받은 줄은
   * 두 받아쓰기가 똑같이 엉터리가 되거나 일본어로 번역되므로 agreed를 쓰지 않는다
   * (일문따 강의 표본 25개 중 6개가 엉터리로 바뀌었다. 한자가 있어도 지어낸 한자였다)
   */
  mixedSpeech?: boolean;
};

export type Judged =
  | { change: false; reason: string }
  | { change: true; kind: "matched" | "agreed" | "kanji"; text: string };

/** 새 글로 바꿔도 안전한지(나아졌는지는 따로 본다). toKana는 한자 낱말을 읽는 법으로 푼다 */
export function isSafeReplacement(
  text: string,
  original: string,
  durationSec: number,
  toKana: (t: string) => string,
): boolean {
  const t = text.trim();
  if (t === "" || !JA_CHAR.test(t)) return false;
  // 원래 글에 한글이 있으면 그 자리에서 한국어로 말한 것이다. 일본어로 고정해 받으면 whisper가 번역해 버린다
  if (HANGUL.test(original)) return false;
  if (isNoiseLine(t) || isSuspectText(t)) return false;
  if (foreignCount(t) > foreignCount(original)) return false;
  const n = [...normalizeJa(toKana(t))].length;
  const o = [...normalizeJa(toKana(original))].length;
  if (o > 0 && (n < o * LENGTH_RATIO.min || n > o * LENGTH_RATIO.max))
    return false;
  if (durationSec > 0 && n / durationSec > MAX_KANA_PER_SEC) return false;
  return true;
}

/** 가나로 푼 비교용 글끼리 닮은 정도 */
export function kanaSimilarity(
  a: string,
  b: string,
  toKana: (t: string) => string,
): number {
  return similarity(normalizeJa(toKana(a)), normalizeJa(toKana(b)));
}

/**
 * 구간 하나를 판정한다.
 * makesWhole(text): 그 글로 바꾸면 구간이 통째로 맞고 파일 전체 맞춤 수가 줄지 않는지(호출하는 쪽이 계산).
 */
export function judge(
  d: Decodes,
  makesWhole: (text: string) => boolean,
  toKana: (t: string) => string,
): Judged {
  const same = (t: string) => normalizeJa(t) === normalizeJa(d.original);
  const options = [d.prompted, d.plain].filter(
    (t): t is string =>
      t !== null &&
      !same(t) &&
      isSafeReplacement(t, d.original, d.durationSec, toKana),
  );
  if (options.length === 0) return { change: false, reason: "no-safe-option" };

  for (const t of options) {
    const other = t === d.prompted ? d.plain : d.prompted;
    const supported =
      (other !== null &&
        kanaSimilarity(t, other, toKana) >= SUPPORT_SIMILARITY) ||
      kanaSimilarity(t, d.original, toKana) >= SUPPORT_SIMILARITY;
    if (supported && makesWhole(t))
      return { change: true, kind: "matched", text: t.trim() };
  }

  if (d.prompted !== null && d.plain !== null && options.includes(d.prompted)) {
    const agree = normalizeJa(d.prompted) === normalizeJa(d.plain);
    const toOriginal = kanaSimilarity(d.prompted, d.original, toKana);
    if (
      agree &&
      toOriginal <= 1 - AGREE_MARGIN &&
      katakanaShare(d.prompted) <= MAX_KATAKANA_SHARE &&
      !d.mixedSpeech
    )
      return { change: true, kind: "agreed", text: d.prompted.trim() };
    // 읽기는 원래와 같고 두 받아쓰기가 똑같이 한자로 적었으면(とくいな → 得意な) 표기만 고친다
    const kana = (t: string) => normalizeJa(toKana(t));
    if (
      normalizeJa(d.prompted) === normalizeJa(d.plain) &&
      kana(d.prompted) === kana(d.original) &&
      kanjiCount(d.prompted) > kanjiCount(d.original)
    )
      return { change: true, kind: "kanji", text: d.prompted.trim() };
  }
  return { change: false, reason: "not-better" };
}

/** prompt 글: 낱말·문장을 、로 잇되 글자 수 상한까지만(whisper prompt는 토큰 224개까지) */
export function buildPrompt(items: string[], maxChars = 150): string {
  const out: string[] = [];
  const seen = new Set<string>();
  let len = 0;
  for (const raw of items) {
    const s = raw.trim();
    if (s === "" || seen.has(s)) continue;
    if (len + s.length + 1 > maxChars) break;
    seen.add(s);
    out.push(s);
    len += s.length + 1;
  }
  return out.join("、");
}
