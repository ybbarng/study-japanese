import { editDistance } from "./match";

// 일본어 가나와 한글을 "들리는 소리"의 거친 자모열로 바꿔 서로 비교한다. 화면을 모르는 순수 함수다.
// whisper가 한국어로 받아 적을 때 일본어 낱말을 한글 소리로 적거나(すきな → 스키나),
// 일본어로 받아 적을 때 한국어 낱말을 가나로 적는다(가수 → かすう). 두 글을 같은 자모열로 맞추면
// 글자는 달라도 소리가 닮았는지 잴 수 있다.
//
// 자모열은 한 글자가 한 소리다.
// 자음: K(ㄱㅋㄲ·か행·が행) S(ㅅㅆㅈㅊㅉ·さ행·ざ행·ち·つ) T(ㄷㅌㄸ·た행·だ행) P(ㅂㅍㅃ·ば행·ぱ행)
//       n m r h y w, 받침 ㄴㅇㅁ·ん은 N, っ은 Q
// 모음: a i u e o(ㅐ·ㅔ는 e, ㅡ·ㅜ는 u)
// 한국어 화자가 일본어를 들을 때 흔히 뭉개지는 차이(유성·무성, 평음·격음, 장음)는 같게 본다.
// 일본어를 한글로 적을 때 쓰지 않는 소리(ㅓ, 받침 ㄹ)는 따로 O·L로 두어, 한국어 낱말이 일본어로 잘못 닮지 않게 한다.

const INITIALS = [
  "K",
  "K",
  "n",
  "T",
  "T",
  "r",
  "m",
  "P",
  "P",
  "S",
  "S",
  "",
  "S",
  "S",
  "S",
  "K",
  "T",
  "P",
  "h",
];
const MEDIALS = [
  "a",
  "e",
  "ya",
  "ye",
  "O",
  "e",
  "yO",
  "ye",
  "o",
  "wa",
  "we",
  "we",
  "yo",
  "u",
  "wO",
  "we",
  "wi",
  "yu",
  "u",
  "ui",
  "i",
];
const FINALS = [
  "",
  "K",
  "K",
  "K",
  "N",
  "N",
  "N",
  "T",
  "L",
  "L",
  "L",
  "L",
  "L",
  "L",
  "L",
  "L",
  "N",
  "P",
  "P",
  "T",
  "T",
  "N",
  "T",
  "T",
  "K",
  "T",
  "P",
  "",
];

const VOWELS = new Set(["a", "i", "u", "e", "o"]);

/** 앞 소리가 S면 y를 뺀다(조/죠, しゃ/さ를 한국어는 가리지 않는다) */
function joinGlide(prev: string, glide: string): string {
  return prev.endsWith("S") && glide.startsWith("y") ? glide.slice(1) : glide;
}

/** 장음을 뺀다: 같은 모음이 잇따르거나 o+u, e+i이면 뒤 모음을 버린다 */
function dropLongVowels(s: string): string {
  let out = "";
  for (const c of s) {
    const p = out.at(-1) ?? "";
    if (
      VOWELS.has(c) &&
      VOWELS.has(p) &&
      (c === p || (p === "o" && c === "u") || (p === "e" && c === "i"))
    )
      continue;
    out += c;
  }
  return out;
}

/** 한글 글을 자모열로. 한글이 아닌 글자는 버린다 */
export function hangulPhones(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) continue;
    const ini = INITIALS[Math.floor(code / 588)];
    const med = MEDIALS[Math.floor((code % 588) / 28)];
    const fin = FINALS[code % 28];
    out += ini + joinGlide(ini, med) + fin;
  }
  return dropLongVowels(out);
}

// 가나 한 글자(히라가나) → 자음+모음
const KANA_ROWS: [string, string][] = [
  ["あいうえお", ""],
  ["かきくけこ", "K"],
  ["がぎぐげご", "K"],
  ["さしすせそ", "S"],
  ["ざじずぜぞ", "S"],
  ["たちつてと", "T"],
  ["だぢづでど", "T"],
  ["なにぬねの", "n"],
  ["はひふへほ", "h"],
  ["ばびぶべぼ", "P"],
  ["ぱぴぷぺぽ", "P"],
  ["まみむめも", "m"],
  ["らりるれろ", "r"],
];
const KANA: Record<string, string> = {};
for (const [row, c] of KANA_ROWS)
  [...row].forEach((k, i) => {
    KANA[k] = c + "aiueo"[i];
  });
Object.assign(KANA, {
  ち: "Si",
  ぢ: "Si",
  つ: "Su",
  づ: "Su",
  や: "ya",
  ゆ: "yu",
  よ: "yo",
  わ: "wa",
  を: "o",
  ゐ: "i",
  ゑ: "e",
  ん: "N",
  っ: "Q",
  ゔ: "Pu",
});
const SMALL_Y: Record<string, string> = { ゃ: "ya", ゅ: "yu", ょ: "yo" };
const SMALL_V: Record<string, string> = {
  ぁ: "a",
  ぃ: "i",
  ぅ: "u",
  ぇ: "e",
  ぉ: "o",
};

function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

/** 가나 글을 자모열로. 가나가 아닌 글자(한자·기호)는 버린다 */
export function kanaPhones(text: string): string {
  let out = "";
  for (const ch of toHiragana(text.normalize("NFKC"))) {
    if (ch in SMALL_Y) {
      // きゃ: 앞 글자의 i를 떼고 ya를 붙인다
      if (out.endsWith("i")) out = out.slice(0, -1);
      out += joinGlide(out, SMALL_Y[ch]);
    } else if (ch in SMALL_V) {
      // ふぁ·しぇ: 앞 글자의 모음을 바꾼다
      if (VOWELS.has(out.at(-1) ?? "")) out = out.slice(0, -1);
      out += SMALL_V[ch];
    } else if (ch in KANA) out += KANA[ch];
  }
  return dropLongVowels(out);
}

/**
 * 한글로 적힌 조각(자모열)이 일본어 낱말(자모열)을 적은 것으로 볼 만큼 닮았나. 0~1 점수, 못 미치면 0.
 * 한국어 낱말과 우연히 닮는 일(동사/でんしゃ, 지금/じかん)은 대개 모음 하나가 바뀐 꼴이고,
 * 한글로 받아 적은 일본어는 소리 하나가 빠지거나 덧붙는 꼴(정수/じょうず, 독이/とくい)이 많다.
 * 그래서 짧은 글(자모 6개까지)은 똑같거나 소리 하나가 빠지거나 덧붙은 것만,
 * 긴 글(7개 이상)은 하나, 10개부터 둘까지 다른 것을 받는다. 자모 4개까지는 똑같아야 한다.
 */
export function hangulMatchScore(hangul: string, kana: string): number {
  const longer = Math.max(hangul.length, kana.length);
  if (hangul === "" || kana === "") return 0;
  const d = editDistance(hangul, kana);
  const ok =
    longer <= 4
      ? d === 0
      : longer <= 6
        ? d === 0 || (d === 1 && hangul.length !== kana.length)
        : d <= Math.max(1, Math.floor((longer - 2) / 4));
  return ok ? 1 - d / longer : 0;
}

/** 두 자모열이 닮은 정도(0~1) */
export function phoneSimilarity(a: string, b: string): number {
  if (a === "" || b === "") return 0;
  if (a === b) return 1;
  return 1 - editDistance(a, b) / Math.max(a.length, b.length);
}
