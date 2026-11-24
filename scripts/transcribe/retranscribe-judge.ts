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
 * ② agreed: 맞춤은 없지만 prompted·plain 두 받아쓰기가 서로 거의 같고, 원래 글만 동떨어졌다.
 * ③ kanji: 읽기는 원래와 같고, 두 받아쓰기가 똑같이 한자를 더 써서 적었다(표기만 고친다).
 * 어느 쪽이든 먼저 안전 검사(환각 문구·되풀이·한글 섞임·길이)를 통과해야 한다.
 */
import { normalizeJa, similarity } from "@/lib/context/match";
import { isNoiseLine, isSuspectText } from "@/lib/transcript/hallucination";

/** 일본어 글자(가나·한자) */
const JA_CHAR = /[ぁ-ゖァ-ヺ\p{Script=Han}]/u;
/** 일본어 받아쓰기에 섞이면 잘못 들은 것: 한글·로마자 */
const FOREIGN = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-zＡ-Ｚａ-ｚ]/gu;

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
/** agreed: 두 새 받아쓰기가 이만큼 닮고, 원래 글과의 닮음보다 이만큼 더 커야 한다 */
export const AGREE_SIMILARITY = 0.85;
export const AGREE_MARGIN = 0.15;

export type Decodes = {
  original: string;
  prompted: string | null;
  plain: string | null;
  /** 구간 길이(초) */
  durationSec: number;
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
    const agree = kanaSimilarity(d.prompted, d.plain, toKana);
    const toOriginal = kanaSimilarity(d.prompted, d.original, toKana);
    if (agree >= AGREE_SIMILARITY && agree >= toOriginal + AGREE_MARGIN)
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
