// 강의 자막(whisper가 받아 적은 글)의 일본어 구간을 소책자 문장과 맞춘다. 화면을 모르는 순수 함수다.
// whisper 글은 문장부호·가나/한자 표기가 소책자와 조금씩 다르고, 한 구간에 두 문장이 붙기도 한다.
// 그래서 ① 문장부호·공백을 빼고 가타카나를 히라가나로 맞춘 뒤 ② 구간을 문장 끝마다 나눠
// ③ 조각마다 가장 닮은 소책자 문장을 글자 편집 거리로 고른다. 닮은 정도가 기준보다 낮으면 맞추지 않는다.

/** 문장부호·기호·공백(장음 ー는 글자로 남긴다) */
const NOISE = /[\s\p{P}\p{S}]/gu;

function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

/** 비교용 글: 반각·전각을 맞추고(NFKC) 가타카나는 히라가나로, 문장부호·공백은 뺀다 */
export function normalizeJa(text: string): string {
  return toHiragana(text.normalize("NFKC")).replace(NOISE, "").toLowerCase();
}

/** 문장 끝(。？！?!)마다 나눈다. 빈 조각은 버린다 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。．？！?!])/u)
    .map((s) => s.trim())
    .filter((s) => normalizeJa(s) !== "");
}

/** 글자 편집 거리(Levenshtein) */
export function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  if (x.length === 0) return y.length;
  if (y.length === 0) return x.length;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[y.length];
}

/** 두 비교용 글이 닮은 정도(0~1). 1이면 같다. 편집 거리를 긴 쪽 길이로 나눠 뺀다 */
export function similarity(a: string, b: string): number {
  if (a === "" || b === "") return 0;
  if (a === b) return 1;
  return 1 - editDistance(a, b) / Math.max([...a].length, [...b].length);
}

/**
 * 맞춘 것으로 볼 기준. 짧은 글은 몇 글자만 같아도 닮아 보이므로 더 엄격하게 본다.
 * 두 글자 이하는 똑같아야 하고, 여덟 글자까지는 0.78, 그보다 길면 0.7.
 * 강의는 소책자 문장의 낱말만 바꿔 말하기도 해서(試験/仕事), 너무 너그러우면 다른 문장을 띄운다.
 */
export function thresholdFor(length: number): number {
  if (length <= 2) return 1;
  if (length <= 8) return 0.78;
  return 0.7;
}

const NEGATIVE = /な(?:い|かった|くて|く)|ません|ず(?:に|$)/g;
const KANJI = /[㐀-鿿豈-﫿々]/g;

function negatives(s: string): number {
  return s.match(NEGATIVE)?.length ?? 0;
}

/**
 * 글자는 닮아도 뜻이 다른 짝을 거른다.
 * ① 부정 표현(ない·なかった·ません…) 수가 다르면 긍정·부정이 뒤집힌 문장이다.
 * ② 둘 다 한자가 있는데 같은 한자가 하나도 없으면 다른 낱말을 넣은 문장이다(会議/曇り).
 */
export function compatible(a: string, b: string): boolean {
  if (negatives(a) !== negatives(b)) return false;
  const ka = new Set(a.match(KANJI) ?? []);
  const kb = b.match(KANJI) ?? [];
  if (ka.size > 0 && kb.length > 0 && !kb.some((k) => ka.has(k))) return false;
  return true;
}

/** 맞출 후보 하나. forms는 같은 문장의 여러 비교용 글(한자 표기, 읽는 법으로 푼 가나 표기) */
export interface MatchCandidate {
  forms: string[];
}

export interface PieceMatch {
  /** 자막 구간 속 조각(원래 글) */
  piece: string;
  /** 맞춘 후보의 차례. 못 맞췄으면 -1 */
  index: number;
  score: number;
}

/**
 * 자막 조각 하나에 가장 닮은 후보. pieceForms도 여러 비교용 글(원래 글, 가나로 푼 글)을 받는다.
 * 기준에 못 미치면 index -1.
 */
export function bestCandidate(
  pieceForms: string[],
  candidates: MatchCandidate[],
): { index: number; score: number } {
  let best = { index: -1, score: 0 };
  for (let i = 0; i < candidates.length; i++) {
    for (const p of pieceForms) {
      if (p === "") continue;
      for (const f of candidates[i].forms) {
        const score = similarity(p, f);
        const need = thresholdFor(Math.min([...p].length, [...f].length));
        if (score >= need && score > best.score && compatible(p, f))
          best = { index: i, score };
      }
    }
  }
  return best;
}

/**
 * 자막 구간 하나를 문장 끝마다 나눠 조각마다 후보를 맞춘다.
 * toKana는 한자 낱말을 읽는 법으로 푸는 함수(없으면 원래 글만 비교한다).
 */
export function matchSegment(
  text: string,
  candidates: MatchCandidate[],
  toKana: (text: string) => string = (t) => t,
): PieceMatch[] {
  if (candidates.length === 0) return [];
  return splitSentences(text).map((piece) => {
    const forms = [
      ...new Set([normalizeJa(piece), normalizeJa(toKana(piece))]),
    ];
    return { piece, ...bestCandidate(forms, candidates) };
  });
}
