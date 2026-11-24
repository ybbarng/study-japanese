import type { CueWord } from "./cards";

// 받아 적은 한국어 뜻(일문따 예문 자막)의 오타를 낱말 뜻으로 바로잡는다. 화면을 모르는 순수 함수다.
// whisper는 한국어 낱말의 모음·받침 하나를 잘못 듣기도 한다(선물 → 산물, 사과 → 사관).
// 그 문장에 든 낱말(낱말 표에서 자리가 확인된 것)의 뜻이 한국어 뜻에 없는데, 자모 하나만 다른 말이
// 낱말 머리에 있으면 그것을 낱말 뜻으로 바꾼다. 맞춤법이 깨진 말이 확신 있게 보이지 않게 한다.

const HANGUL_ONLY = /^[가-힣]+$/u;

/** 한글 음절 하나의 초성·중성·종성 번호 */
function jamo(syllable: string): [number, number, number] {
  const c = syllable.charCodeAt(0) - 0xac00;
  return [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28];
}

/** 같은 길이 한글 두 말의 자모 차이 수 */
export function jamoDistance(a: string, b: string): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const x = jamo(a[i]);
    const y = jamo(b[i]);
    for (let k = 0; k < 3; k++) if (x[k] !== y[k]) d++;
  }
  return d;
}

/**
 * 낱말 뜻의 첫 말(쉼표·괄호 앞). 바로잡기에 쓸 만한 명사만: 한글 두 글자 이상이고, 「~다」(동사·형용사)나
 * 「~임·~음·~함·~기」(명사형으로 적은 서술어)로 끝나지 않는 말. 이런 뜻은 한국어 뜻에서 활용해 모양이 바뀐다.
 */
function headGloss(w: CueWord): string | null {
  const head = w.ko.split(/[,，(（/]/u)[0].trim();
  if (!HANGUL_ONLY.test(head) || head.length < 2) return null;
  if (/[다임음함기]$/u.test(head) || PRONOUNS.has(head)) return null;
  return head;
}

/** 조사·어미와 줄어 붙어 모양이 바뀌는 대명사(누구 → 누군가·누굴) */
const PRONOUNS = new Set([
  "누구",
  "무엇",
  "어디",
  "언제",
  "이것",
  "그것",
  "저것",
]);

/** 명사 뒤에 붙어 띄어쓴 말을 끝맺는 조사들(없어도 된다) */
const PARTICLES_TO_END =
  /^(?:[은는이가을를의도와과만]|에(?:서|게|도)?|으?로|부터|까지|처럼|보다)*(?=$|[\s\p{P}])/u;

function hasBatchim(syllable: string): boolean {
  return jamo(syllable)[2] !== 0;
}

/** 바꾼 말 뒤 조사를 받침에 맞춘다(사과+은 → 사과는) */
function fixParticle(rest: string, word: string): string {
  const batchim = hasBatchim(word.slice(-1));
  const pairs: [string, string][] = [
    ["은", "는"],
    ["이", "가"],
    ["을", "를"],
    ["과", "와"],
  ];
  for (const [withB, withoutB] of pairs) {
    const from = batchim ? withoutB : withB;
    const to = batchim ? withB : withoutB;
    if (new RegExp(`^${from}(?=$|[\\s\\p{P}])`, "u").test(rest))
      return to + rest.slice(1);
  }
  return rest;
}

/**
 * 한국어 뜻 ko를, 그 문장에 든 낱말들(words)의 뜻으로 바로잡은 글.
 * 낱말 뜻이 ko에 없고, 띄어쓴 말 하나가 「자모 하나만 다른 같은 길이 말 + 조사」인 곳이 하나뿐일 때 바꾼다.
 * 다른 말이 붙은 합성어(아드+님)와 조사가 줄어 붙는 대명사(누가)는 건드리지 않는다.
 */
export function repairMeaning(ko: string, words: CueWord[]): string {
  let out = ko;
  for (const w of words) {
    const gloss = headGloss(w);
    if (!gloss || out.includes(gloss)) continue;
    const spots: number[] = [];
    for (let i = 0; i + gloss.length <= out.length; i++) {
      if (i > 0 && /[가-힣]/u.test(out[i - 1])) continue;
      const piece = out.slice(i, i + gloss.length);
      if (!HANGUL_ONLY.test(piece) || jamoDistance(piece, gloss) !== 1)
        continue;
      if (!PARTICLES_TO_END.test(out.slice(i + gloss.length))) continue;
      spots.push(i);
    }
    if (spots.length !== 1) continue;
    const at = spots[0];
    const rest = fixParticle(out.slice(at + gloss.length), gloss);
    out = out.slice(0, at) + gloss + rest;
  }
  return out;
}
