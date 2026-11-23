import { type CardId, cardId, type Script, SOUNDS } from "./data";

/** 소리가 아닌 표시: 촉음(っ), 장음(ー) */
export type Mark = "sokuon" | "chouon";

export const MARK_CHARS: Record<Mark, string[]> = {
  sokuon: ["っ", "ッ"],
  chouon: ["ー"],
};

export interface Unit {
  text: string;
  soundId?: string;
  mark?: Mark;
}

const UNIT_TO_SOUND = new Map<string, string>();
for (const sound of SOUNDS) {
  if (sound.hira) UNIT_TO_SOUND.set(sound.hira, sound.id);
  if (sound.kata) UNIT_TO_SOUND.set(sound.kata, sound.id);
}
const MARK_BY_CHAR = new Map<string, Mark>();
for (const [mark, chars] of Object.entries(MARK_CHARS) as [Mark, string[]][]) {
  for (const c of chars) MARK_BY_CHAR.set(c, mark);
}

/** 가나 낱말을 글자 단위(요음·외래어 조합은 두 글자 한 단위)로 나눈다. 모르는 글자는 soundId·mark 없이 남긴다. */
export function tokenize(word: string): Unit[] {
  const chars = [...word];
  const out: Unit[] = [];
  let i = 0;
  while (i < chars.length) {
    const two = chars[i] + (chars[i + 1] ?? "");
    if (chars[i + 1] && UNIT_TO_SOUND.has(two)) {
      out.push({ text: two, soundId: UNIT_TO_SOUND.get(two) });
      i += 2;
      continue;
    }
    const one = chars[i];
    const soundId = UNIT_TO_SOUND.get(one);
    const mark = MARK_BY_CHAR.get(one);
    if (soundId) out.push({ text: one, soundId });
    else if (mark) out.push({ text: one, mark });
    else out.push({ text: one });
    i += 1;
  }
  return out;
}

/** 가타카나가 하나라도 있으면 가타카나 낱말로 본다(ー는 가타카나 낱말에만 쓴다고 본다). */
export function scriptOf(word: string): Script {
  return /[ァ-ヺー]/.test(word) ? "kata" : "hira";
}

/** 낱말에 쓰인 카드 id와 표시 */
export function requirementsOf(word: string): {
  cards: CardId[];
  marks: Mark[];
  unknown: string[];
} {
  const script = scriptOf(word);
  const cards = new Set<CardId>();
  const marks = new Set<Mark>();
  const unknown: string[] = [];
  for (const u of tokenize(word)) {
    if (u.soundId) cards.add(cardId(script, u.soundId));
    else if (u.mark) marks.add(u.mark);
    else unknown.push(u.text);
  }
  return { cards: [...cards], marks: [...marks], unknown };
}

/** 배운 글자·표시만으로 읽을 수 있는 낱말인지 */
export function isReadableWith(
  word: string,
  learnedCards: ReadonlySet<CardId>,
  learnedMarks: ReadonlySet<Mark>,
): boolean {
  const req = requirementsOf(word);
  return (
    req.unknown.length === 0 &&
    req.cards.every((c) => learnedCards.has(c)) &&
    req.marks.every((m) => learnedMarks.has(m))
  );
}

export function toHiragana(text: string): string {
  return text.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  );
}

export function toKatakana(text: string): string {
  return text.replace(/[ぁ-ゖ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60),
  );
}

// ─── 로마자 → 가나 (입력기 없이 칠 때) ─────────────────────

const ROMAJI_TABLE = new Map<string, string>();
for (const sound of SOUNDS) {
  const kana = sound.hira ?? (sound.kata ? toHiragana(sound.kata) : "");
  for (const spelling of sound.input) {
    if (spelling === "n") continue; // n 하나는 뒤 글자를 보고 정한다
    if (!ROMAJI_TABLE.has(spelling)) ROMAJI_TABLE.set(spelling, kana);
  }
}
const SMALL: Record<string, string> = {
  a: "ぁ",
  i: "ぃ",
  u: "ぅ",
  e: "ぇ",
  o: "ぉ",
  ya: "ゃ",
  yu: "ゅ",
  yo: "ょ",
  tu: "っ",
  tsu: "っ",
};
for (const [k, v] of Object.entries(SMALL)) {
  ROMAJI_TABLE.set(`x${k}`, v);
  ROMAJI_TABLE.set(`l${k}`, v);
}
const MAX_KEY = Math.max(...[...ROMAJI_TABLE.keys()].map((k) => k.length));
const VOWELS = new Set(["a", "i", "u", "e", "o"]);

function isPrefixOfKey(rest: string): boolean {
  for (const k of ROMAJI_TABLE.keys()) if (k.startsWith(rest)) return true;
  return false;
}

/**
 * 로마자를 가나로 바꾼다. 아직 글자가 되지 않은 끝 로마자는 그대로 남긴다(입력 중).
 * `final`이면 끝의 n 하나도 ん으로 바꾼다.
 */
export function romajiToKana(
  input: string,
  script: Script,
  final = false,
): string {
  const src = input.toLowerCase();
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "-") {
      out += "ー";
      i += 1;
      continue;
    }
    if (c === "n") {
      if (next === "n" || next === "'") {
        out += "ん";
        i += 2;
        continue;
      }
      if (next !== undefined && !VOWELS.has(next) && next !== "y") {
        out += "ん";
        i += 1;
        continue;
      }
      if (next === undefined && final) {
        out += "ん";
        i += 1;
        continue;
      }
    }
    if (c === "t" && next === "c" && src[i + 2] === "h") {
      out += "っ"; // matcha
      i += 1;
      continue;
    }
    if (
      next !== undefined &&
      c === next &&
      /[a-z]/.test(c) &&
      !VOWELS.has(c) &&
      c !== "n"
    ) {
      out += "っ";
      i += 1;
      continue;
    }
    let matched = false;
    for (let len = Math.min(MAX_KEY, src.length - i); len > 0; len--) {
      const kana = ROMAJI_TABLE.get(src.slice(i, i + len));
      if (kana) {
        out += kana;
        i += len;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const rest = src.slice(i);
    if (!final && isPrefixOfKey(rest)) {
      out += rest;
      break;
    }
    out += c;
    i += 1;
  }
  return script === "kata" ? toKatakana(out) : out;
}

/**
 * 가나 낱말을 로마자로 적는다.
 * - 보기용(기본): 촉음은 다음 자음을 겹치고(きって → kitte), 장음 ー는 앞 모음을 겹친다.
 * - 입력용(`typing`): 입력기에서 그대로 칠 철자. ー는 "-", ん은 "nn", を는 "wo".
 */
export function kanaToRomaji(word: string, typing = false): string {
  const units = tokenize(word);
  let out = "";
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.mark === "sokuon") {
      const next = units[i + 1]?.soundId;
      const nextRomaji = next ? romajiOf(next, typing) : "";
      if (nextRomaji.startsWith("ch")) out += typing ? "c" : "t";
      else if (nextRomaji) out += nextRomaji[0];
      else out += typing ? "xtu" : "";
      continue;
    }
    if (u.mark === "chouon") {
      out += typing ? "-" : (out.match(/[aeiou](?=[^aeiou]*$)/)?.[0] ?? "");
      continue;
    }
    if (!u.soundId) {
      out += u.text;
      continue;
    }
    if (u.soundId === "n") {
      // 입력기에서는 nn으로 쳐야 어느 자리에서든 ん이 된다
      out += typing ? "nn" : "n";
      continue;
    }
    out += romajiOf(u.soundId, typing);
  }
  return out;
}

function romajiOf(soundId: string, typing: boolean): string {
  const sound = SOUNDS.find((x) => x.id === soundId);
  if (!sound) return "";
  return typing ? sound.input[0] : sound.romaji;
}

/** 쳐 넣은 답이 낱말과 같은지. 히라가나·가타카나 차이와 앞뒤 공백은 넘어간다. */
export function sameKana(typed: string, answer: string): boolean {
  return toHiragana(typed.trim()) === toHiragana(answer.trim());
}
