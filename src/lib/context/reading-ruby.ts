import {
  type Glossary,
  hasKanji,
  type RubySegment,
  splitOkurigana,
} from "@/lib/ilmuta/ruby";
import { normalizeJa } from "./match";
import { numberReadings } from "./number-reading";
import { verifiedRubySegments } from "./word-bounds";

// 문장 전체의 읽는 법(교정 파일·문장 읽기 파일의 reading)을 한자 덩어리마다 나눠 단다. 화면을 모르는 순수 함수다.
// 가나 부분을 닻으로 삼아, 문장 읽기를 한자 덩어리마다 가를 수 있는 방법을 모두 늘어놓는다(山のカメラ + やまのかめら → 山=やま).
// - 모든 방법에서 같은 읽기가 나오는 덩어리만 단다. 갈래가 여럿이면(数学が苦手: すうがく|にがて, すう|くがにがて)
//   낱말 표 읽기와 가장 많이 맞는 갈래만 남기고, 그래도 갈리는 덩어리는 비운다.
// - 숫자는 읽을 수 있는 소리(number-reading.ts)로 빼고 남은 가나를 뒤 한자에 단다(7時: しちじ → 時=じ).
//   숫자 자체에는 읽기를 달지 않는다.
// - 문장 읽기가 있으면 낱말 표 읽기로 되돌아가지 않는다. 낱말 표는 활용형을 먼저 잡아 틀리기 쉽다
//   (はいれます의 入れ를 いれる로). 틀린 읽기를 다느니 안 단다.
// 문장 읽기가 없을 때만 자리가 확인된 낱말의 읽기를 단다(verifiedRubySegments).

const TOKEN =
  /[㐀-鿿豈-﫿々〆]+|[ぁ-ゖァ-ヺー]+|[^㐀-鿿豈-﫿々〆ぁ-ゖァ-ヺー]+/gu;
const KANJI_RUN = /^[㐀-鿿豈-﫿々〆]+$/u;
const KANA_RUN = /^[ぁ-ゖァ-ヺー]+$/u;
/** 한자 읽기의 첫 글자로 올 수 없는 가나(작은 가나·ん·ー) */
const BAD_START = /^[ぁぃぅぇぉっゃゅょゎんー]/u;
/** 한자 한 글자 읽기의 가장 긴 길이(承る うけたまわ) */
const MAX_PER_KANJI = 5;
/** 늘어놓을 갈래의 상한. 넘으면 가르는 자리를 모르는 것으로 본다 */
const MAX_SOLUTIONS = 64;
/** 찾기 걸음의 상한(긴 문장에서 열린 자리가 많을 때) */
const MAX_STEPS = 50_000;

const byFirstCache = new WeakMap<Glossary, Map<string, string[]>>();

/** 낱말 표 열쇠를 첫 글자로 묶는다(낱말 표마다 한 번) */
function keysByFirst(glossary: Glossary): Map<string, string[]> {
  const hit = byFirstCache.get(glossary);
  if (hit) return hit;
  const out = new Map<string, string[]>();
  for (const key of Object.keys(glossary)) {
    const list = out.get(key[0]) ?? [];
    list.push(key);
    out.set(key[0], list);
  }
  byFirstCache.set(glossary, out);
  return out;
}

/**
 * 한자 덩어리 run(text의 at 자리)의 읽기를 낱말 표에서 찾는다: 덩어리 뒤 가나까지 이어진 낱말(来ない: こない)이
 * 그 자리 글과 같으면 그 낱말의 한자 부분 읽기(こ). 가장 긴 낱말 하나만 보고, 없으면 undefined
 */
function runReading(
  text: string,
  at: number,
  run: string,
  glossary: Glossary,
): string | undefined {
  let best: string | undefined;
  for (const key of keysByFirst(glossary).get(run[0]) ?? [])
    if (
      key.length > run.length &&
      key.startsWith(run) &&
      KANA_RUN.test(key.slice(run.length)) &&
      text.startsWith(key, at) &&
      (!best || key.length > best.length)
    )
      best = key;
  if (!best) return undefined;
  const head = splitOkurigana(best, glossary[best])[0];
  return head?.text === run ? head.reading : undefined;
}

type Piece =
  | { kind: "kanji"; text: string; hints: Set<string> }
  | { kind: "kana"; plain: string }
  | { kind: "number"; readings: string[] }
  | { kind: "open" };

/** 글을 조각으로 나눈다. 부호·빈칸만인 조각은 읽기에 없으니 뺀다(null) */
function piecesOf(
  text: string,
  glossary: Glossary,
): { tokens: string[]; pieces: (Piece | null)[] } {
  const tokens = text.match(TOKEN) ?? [];
  let at = 0;
  const pieces = tokens.map((t): Piece | null => {
    const start = at;
    at += t.length;
    if (KANJI_RUN.test(t)) {
      const hints = new Set<string>();
      for (const h of [runReading(text, start, t, glossary), glossary[t]])
        if (h) hints.add(normalizeJa(h));
      return { kind: "kanji", text: t, hints };
    }
    if (KANA_RUN.test(t)) return { kind: "kana", plain: normalizeJa(t) };
    const plain = normalizeJa(t);
    if (plain === "") return null;
    const readings = /^[0-9]+$/u.test(plain) ? numberReadings(plain) : [];
    return readings.length ? { kind: "number", readings } : { kind: "open" };
  });
  return { tokens, pieces };
}

/**
 * 문장 읽기 plain을 조각마다 가르는 방법을 모두 찾는다(한자 덩어리 조각의 읽기 배열).
 * 상한을 넘으면 null(가르는 자리를 모른다)
 */
function splits(pieces: Piece[], plain: string): string[][] | null {
  const out: string[][] = [];
  const chosen: string[] = [];
  let steps = 0;
  let overflow = false;
  const walk = (k: number, pos: number) => {
    if (overflow) return;
    if (++steps > MAX_STEPS) {
      overflow = true;
      return;
    }
    if (k === pieces.length) {
      if (pos === plain.length) {
        out.push([...chosen]);
        if (out.length > MAX_SOLUTIONS) overflow = true;
      }
      return;
    }
    const p = pieces[k];
    if (p.kind === "kana") {
      if (plain.startsWith(p.plain, pos)) walk(k + 1, pos + p.plain.length);
      return;
    }
    if (p.kind === "number") {
      for (const r of p.readings)
        if (plain.startsWith(r, pos)) walk(k + 1, pos + r.length);
      return;
    }
    const len = p.kind === "kanji" ? [...p.text].length : 1;
    const max = p.kind === "kanji" ? len * MAX_PER_KANJI : plain.length;
    for (let n = len; n <= max && pos + n <= plain.length; n++) {
      const r = plain.slice(pos, pos + n);
      if (p.kind === "kanji") {
        if (BAD_START.test(r)) break;
        chosen.push(r);
        walk(k + 1, pos + n);
        chosen.pop();
      } else walk(k + 1, pos + n);
    }
  };
  walk(0, 0);
  return overflow ? null : out;
}

/**
 * 한자 덩어리마다 정해진 읽기. 낱말 표 읽기와 가장 많이 맞는 갈래만 남기고,
 * 남은 갈래가 모두 같은 읽기를 주는 덩어리만 채운다(나머지는 undefined)
 */
function agreedReadings(
  kanji: Extract<Piece, { kind: "kanji" }>[],
  found: string[][],
): (string | undefined)[] {
  const score = (s: string[]) =>
    s.filter((r, i) => kanji[i].hints.has(r)).length;
  const best = Math.max(...found.map(score));
  const kept = found.filter((s) => score(s) === best);
  return kanji.map((_, i) =>
    kept.every((s) => s[i] === kept[0][i]) ? kept[0][i] : undefined,
  );
}

/** 문장 읽기로 한자 덩어리마다 읽기를 정한다. 어떤 갈래로도 맞지 않거나 너무 많으면 모두 undefined */
function readingsFromSentence(
  pieces: Piece[],
  plain: string,
): (string | undefined)[] {
  const kanji = pieces.filter(
    (p): p is Extract<Piece, { kind: "kanji" }> => p.kind === "kanji",
  );
  const found = splitsOpeningNumbers(pieces, plain);
  if (!found || found.length === 0) return kanji.map(() => undefined);
  return agreedReadings(kanji, found);
}

/** 숫자 조각을 하나씩 열어 볼 때 다루는 숫자 조각 수의 상한. 넘으면 한꺼번에 연다 */
const MAX_NUMBER_SUBSETS = 4;

/**
 * splits와 같되, 숫자 읽기 후보가 맞지 않는 숫자(1人 ひとり처럼 통째로 읽는 말)는 열린 자리로 두고 다시 본다.
 * 여는 숫자가 적은 갈래부터 보아, 같은 문장의 다른 숫자(1枚)는 후보 읽기로 계속 가른다
 */
function splitsOpeningNumbers(
  pieces: Piece[],
  plain: string,
): string[][] | null {
  const numbers = pieces.flatMap((p, i) => (p.kind === "number" ? [i] : []));
  const opened = (open: Set<number>) =>
    splits(
      pieces.map((p, i) => (open.has(i) ? { kind: "open" as const } : p)),
      plain,
    );
  if (numbers.length > MAX_NUMBER_SUBSETS) {
    const strict = splits(pieces, plain);
    return strict?.length ? strict : opened(new Set(numbers));
  }
  for (let size = 0; size <= numbers.length; size++) {
    const union: string[][] = [];
    for (const subset of subsetsOf(numbers, size)) {
      const found = opened(new Set(subset));
      if (found === null) return null;
      union.push(...found);
    }
    if (union.length) return union;
  }
  return [];
}

/** list에서 size개를 고르는 모든 방법 */
function subsetsOf(list: number[], size: number): number[][] {
  if (size === 0) return [[]];
  return list.flatMap((x, i) =>
    subsetsOf(list.slice(i + 1), size - 1).map((rest) => [x, ...rest]),
  );
}

export function rubyFromReading(
  text: string,
  reading: string | null | undefined,
  glossary: Glossary,
): RubySegment[] {
  if (!reading || !hasKanji(text)) return verifiedRubySegments(text, glossary);
  const { tokens, pieces } = piecesOf(text, glossary);
  const readings = readingsFromSentence(
    pieces.filter((p): p is Piece => p !== null),
    normalizeJa(reading),
  );
  const out: RubySegment[] = [];
  let k = 0;
  for (const t of tokens) {
    if (KANJI_RUN.test(t)) {
      const r = readings[k++];
      if (r) {
        out.push({ text: t, reading: r });
        continue;
      }
    }
    const last = out[out.length - 1];
    if (last && last.reading === undefined) last.text += t;
    else out.push({ text: t });
  }
  return out;
}
