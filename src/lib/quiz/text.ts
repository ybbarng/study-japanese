// 확인 문제를 만들 때 쓰는 글 다루기. 보기끼리 뜻이 겹치지 않게, 문형 머리에서 빈칸 조각을 뽑게.

/** 문장부호(빈칸 조각·어순 조각을 가를 때 떼어 낸다) */
export const PUNCT = /[、。，．,.？?！!…‥「」『』（）()\s〜～/]/g;

/** 한국어 뜻의 알맹이들. 괄호 속 덧말을 떼고 쉼표로 나눈다(`나(여자)` → `나`, `세탁, 빨래` → `세탁`·`빨래`) */
export function meaningCores(ko: string): string[] {
  return ko
    .replace(/\([^)]*\)|（[^）]*）/g, "")
    .split(/[,，/]/)
    .map((s) => s.replace(/[~～.]/g, "").trim())
    .filter((s) => s.length > 0);
}

/**
 * 두 뜻이 겹치는지(같은 보기 묶음에 두면 정답이 둘이 된다).
 * 알맹이가 같거나, 두 글자 넘는 알맹이가 다른 쪽 알맹이를 품으면 겹친다고 본다
 */
export function meaningsOverlap(a: string, b: string): boolean {
  const ca = meaningCores(a);
  const cb = meaningCores(b);
  if (ca.length === 0 || cb.length === 0) return a.trim() === b.trim();
  return ca.some((x) =>
    cb.some(
      (y) =>
        x === y ||
        (x.length >= 2 && y.includes(x)) ||
        (y.length >= 2 && x.includes(y)),
    ),
  );
}

/** 문장 뜻을 견줄 때: 문장부호·공백을 떼고 */
export function sameSentenceKo(a: string, b: string): boolean {
  const norm = (s: string) => s.replace(/[\s.,!?~…·'"()（）]/g, "");
  return norm(a) === norm(b);
}

/**
 * 문형 머리(`～は～じゃない。`, `～前に[まえに]`)에서 고정된 글 조각을 뽑는다.
 * 읽는 법 괄호를 떼고 ～·/·문장부호로 나눈다
 */
export function patternPieces(head: string): string[] {
  const pieces = head
    .replace(/\[[^\]]*\]/g, "")
    .split(PUNCT)
    .map((s) => s.trim())
    // 일본어 글자가 든 조각만(머리에 한국어 덧말이 섞인 것이 있다)
    .filter((s) => JAPANESE.test(s) && !HANGUL.test(s))
    // 한 글자 조각은 조사일 때만(활용 어미 る·ます 조각은 낱말 조각이라 빈칸 보기로 말이 안 된다)
    .filter((s) => Array.from(s).length > 1 || SINGLE_PARTICLES.has(s))
    .filter((s) => s !== "ます" && s !== "です");
  return [...new Set(pieces)];
}

const SINGLE_PARTICLES = new Set([
  "は",
  "が",
  "を",
  "に",
  "で",
  "も",
  "と",
  "へ",
  "の",
  "か",
  "や",
]);

const JAPANESE = /[぀-ヿ一-鿿]/;
const HANGUL = /[가-힣]/;

/** 화면에 보일 문형 머리·뜻: 읽는 법 괄호를 떼고, 앞뒤와 겹친 / 를 정리한다 */
export function cleanHead(head: string): string {
  return head
    .replace(/\[[^\]]*\]/g, "")
    .replace(/(\s*\/\s*)+/g, " / ")
    .replace(/^\s*\/\s*|\s*\/\s*$/g, "")
    .trim();
}

/** 글 안에 조각이 몇 번 나오는지 */
export function countOf(text: string, piece: string): number {
  if (piece === "") return 0;
  let n = 0;
  let at = text.indexOf(piece);
  while (at >= 0) {
    n++;
    at = text.indexOf(piece, at + piece.length);
  }
  return n;
}

/** 둘 중 하나가 다른 하나를 품는지(빈칸 보기로 함께 두면 둘 다 말이 될 수 있다) */
export function nested(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a);
}

/** 문장 끝 문장부호(。？！ 등)를 떼어 둘로 */
export function splitTail(ja: string): { body: string; tail: string } {
  const m = ja.match(/[。？?！!…‥.]+$/);
  if (!m) return { body: ja, tail: "" };
  return { body: ja.slice(0, ja.length - m[0].length), tail: m[0] };
}

/** 문장부호와 공백을 뺀 글자 수 */
export function bareLength(ja: string): number {
  return Array.from(ja.replace(PUNCT, "")).length;
}

// --- 읽는 법 헷갈리게 바꾸기 ---

const DAKUTEN: Record<string, string> = {
  か: "が",
  き: "ぎ",
  く: "ぐ",
  け: "げ",
  こ: "ご",
  さ: "ざ",
  し: "じ",
  す: "ず",
  せ: "ぜ",
  そ: "ぞ",
  た: "だ",
  ち: "ぢ",
  つ: "づ",
  て: "で",
  と: "ど",
  は: "ば",
  ひ: "び",
  ふ: "ぶ",
  へ: "べ",
  ほ: "ぼ",
};
const UNDAKUTEN: Record<string, string> = Object.fromEntries(
  Object.entries(DAKUTEN).map(([a, b]) => [b, a]),
);
/** 작은 っ 뒤에 올 수 있는 줄(か·さ·た·ぱ 줄) */
const GEMINATE_NEXT = /[かきくけこさしすせそたちつてとぱぴぷぺぽ]/;
/** 오·우 단(길게 읽으면 う가 붙는 글자) */
const O_U_ROW =
  /[おこそとのほもよろごぞどぼぽょゅうくすつぬふむゆるぐずづぶぷ]/;

export interface ReadingSlip {
  reading: string;
  /** 정답과 무엇이 다른지(틀린 보기를 골랐을 때 보인다) */
  why: string;
}

/**
 * 정답 읽는 법을 학습자가 실제로 헷갈리는 쪽으로 한 군데 바꾼 것들.
 * 장음(う·い)을 빼거나 넣고, 탁음(゛)을 붙이거나 떼고, 작은 っ를 빼거나 넣는다
 */
export function readingSlips(reading: string): ReadingSlip[] {
  const chars = Array.from(reading);
  const out: ReadingSlip[] = [];
  const add = (next: string[], why: string) => {
    const r = next.join("");
    if (r !== reading && r.length > 0 && !out.some((o) => o.reading === r))
      out.push({ reading: r, why });
  };
  chars.forEach((c, i) => {
    const prev = chars[i - 1];
    // 장음 빼기: おう·ゅう·うう·えい의 뒷글자
    if (
      i > 0 &&
      ((c === "う" && O_U_ROW.test(prev)) ||
        (c === "い" && /[えけせてねへめれげぜでべぺ]/.test(prev)))
    )
      add(
        [...chars.slice(0, i), ...chars.slice(i + 1)],
        `길게 읽는 소리(${c})가 빠졌습니다`,
      );
    // 장음 넣기: 오·우 단 뒤에 う(다음 글자가 이미 う면 넣지 않는다)
    if (/[ょゅこそとほもろごぞどぼ]/.test(c) && chars[i + 1] !== "う")
      add(
        [...chars.slice(0, i + 1), "う", ...chars.slice(i + 1)],
        "길게 읽지 않는 말인데 う를 넣었습니다",
      );
    // 탁음 붙이기·떼기
    if (DAKUTEN[c])
      add(
        [...chars.slice(0, i), DAKUTEN[c], ...chars.slice(i + 1)],
        "탁음(゛)이 붙지 않는 글자입니다",
      );
    if (UNDAKUTEN[c])
      add(
        [...chars.slice(0, i), UNDAKUTEN[c], ...chars.slice(i + 1)],
        "탁음(゛)을 붙여 읽어야 합니다",
      );
    // 작은 っ 빼기·넣기
    if (c === "っ")
      add(
        [...chars.slice(0, i), ...chars.slice(i + 1)],
        "작은 っ(잠깐 멈추는 소리)가 빠졌습니다",
      );
    if (i > 0 && GEMINATE_NEXT.test(c) && prev !== "っ" && prev !== "ん")
      add(
        [...chars.slice(0, i), "っ", ...chars.slice(i)],
        "작은 っ가 없는 말입니다",
      );
  });
  return out;
}
