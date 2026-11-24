import type { Sentence } from "@/lib/textbook/schema";
import type { CueCard } from "./cards";
import { compatible, normalizeJa, similarity } from "./match";

// 예문 mp3는 소책자 문장을 정해진 차례로 읽는다(단어·문형·회화). 차례를 알면 받아쓰기가 많이 틀려도
// 어느 문장인지 좁힐 수 있다. 바로 맞춘 앞뒤 구간(닻) 사이에서 아직 읽지 않은 문장 조각만 견주므로,
// 닮은 정도 기준을 강의보다 낮춰도 엉뚱한 문장이 붙기 어렵다. 화면을 모르는 순수 함수다.
// 회화로 다지기는 같은 회화를 여러 번 되풀이하므로, 뒤 닻이 앞 닻보다 앞 문장이면 끝에서 처음으로 돈다고 본다.

export interface AlignSegment {
  text: string;
  lang: "ko" | "ja";
}

/** 문장 조각 하나: 소책자 문장 차례(k)와 비교용 글 */
interface Unit {
  k: number;
  plain: string;
  kana: string;
}

/** 조각을 이만큼까지 이어 붙여 한 구간과 견준다(받아쓰기가 두 문장을 한 줄로 붙이기도 한다) */
const MAX_RUN = 4;
/** 닻이 한쪽에만 있을 때 그 너머로 볼 조각 수 */
const OPEN_WINDOW = 4;
/** 좁은 창(조각 수)에서는 기준을 더 낮춘다 */
const NARROW_WINDOW = 8;

/** 문장 끝·쉼표마다 나눈 조각들 */
function partsOf(ja: string): string[] {
  return ja
    .split(/(?<=[。．？！?!、，,…])|\s+/u)
    .filter((p) => normalizeJa(p) !== "");
}

function unitsOf(sentences: Sentence[], toKana: (t: string) => string): Unit[] {
  const out: Unit[] = [];
  sentences.forEach((s, k) => {
    const parts = partsOf(s.ja);
    for (const p of parts)
      out.push({
        k,
        plain: normalizeJa(p),
        kana: normalizeJa(
          parts.length === 1 && s.reading ? s.reading : toKana(p),
        ),
      });
  });
  return out;
}

/** 같은 말을 한 줄에 두 번 받아 적었으면(「AA」) 한 번만 */
export function undoubled(plain: string): string {
  const chars = [...plain];
  const half = chars.length / 2;
  if (chars.length >= 4 && Number.isInteger(half)) {
    const a = chars.slice(0, half).join("");
    if (a === chars.slice(half).join("")) return a;
  }
  return plain;
}

/** 원래 글에서 같은 말이 두 번이면(빈칸·부호를 사이에 둔 「A A」) 앞의 것만 */
export function undoubledText(text: string): string {
  const t = text.trim();
  for (const m of t.matchAll(/[\s\p{P}]+/gu)) {
    const at = m.index ?? 0;
    const left = t.slice(0, at + m[0].length);
    const right = t.slice(at + m[0].length);
    if (right !== "" && normalizeJa(left) === normalizeJa(right))
      return left.trim();
  }
  return t;
}

/** 조각 길이와 창 크기에 따른 기준 */
function need(length: number, windowUnits: number): number {
  if (length <= 2) return 1;
  if (length <= 4) return 0.75;
  return windowUnits <= NARROW_WINDOW ? 0.55 : 0.65;
}

/** 볼 조각 범위들([처음, 끝] 포함) */
function windowOf(
  prev: number | null,
  next: number | null,
  size: number,
): [number, number][] {
  const last = size - 1;
  if (prev !== null && next !== null)
    return prev <= next
      ? [[prev, next]]
      : [
          [prev, last],
          [0, next],
        ];
  if (prev !== null) return [[prev, Math.min(last, prev + OPEN_WINDOW)]];
  if (next !== null) return [[Math.max(0, next - OPEN_WINDOW), next]];
  return [[0, last]];
}

/**
 * 맞추지 못한 일본어 구간을 읽는 차례로 소책자 문장과 맞춘다.
 * cards는 바로 맞춘 결과(구간 전체를 맞춘 카드가 닻), makeCard는 고른 문장으로 카드를 만든다.
 * 새로 맞춘 구간도 다음 구간의 앞 닻이 된다.
 */
export function alignInOrder(
  segments: AlignSegment[],
  cards: Record<string, CueCard>,
  ordered: Sentence[],
  toKana: (t: string) => string,
  makeCard: (sentences: Sentence[]) => CueCard,
): Record<string, CueCard> {
  const units = unitsOf(ordered, toKana);
  if (units.length === 0) return cards;
  const out = { ...cards };
  const keyOf = (s: { ja: string }) => normalizeJa(s.ja);
  const firstUnit = new Map<string, number>();
  const lastUnit = new Map<string, number>();
  units.forEach((u, i) => {
    const key = keyOf(ordered[u.k]);
    if (!firstUnit.has(key)) firstUnit.set(key, i);
    lastUnit.set(key, i);
  });
  /** 구간 전체를 차례 안 문장과 맞춘 카드면 그 조각 범위 */
  const span = (card: CueCard | undefined): [number, number] | null => {
    if (!card?.whole || card.sentences.length === 0) return null;
    const firsts = card.sentences.map((s) => firstUnit.get(keyOf(s)));
    const lasts = card.sentences.map((s) => lastUnit.get(keyOf(s)));
    if (firsts.some((f) => f === undefined)) return null;
    return [
      Math.min(...(firsts as number[])),
      Math.max(...(lasts as number[])),
    ];
  };
  // 뒤 닻: 바로 맞춘 결과에서 미리 찾아 둔다
  const nextAnchor: (number | null)[] = Array(segments.length).fill(null);
  let upcoming: number | null = null;
  for (let i = segments.length - 1; i >= 0; i--) {
    nextAnchor[i] = upcoming;
    const s = span(cards[String(i)]);
    if (s) upcoming = s[0];
  }

  let prev: number | null = null;
  segments.forEach((seg, i) => {
    const own = span(out[String(i)]);
    if (own) {
      prev = own[1];
      return;
    }
    if (seg.lang !== "ja") return;
    const plain = undoubled(normalizeJa(seg.text));
    if (plain === "") return;
    const forms = [
      ...new Set([plain, undoubled(normalizeJa(toKana(seg.text)))]),
    ];
    const ranges = windowOf(prev, nextAnchor[i], units.length);
    const size = ranges.reduce((n, [a, b]) => n + b - a + 1, 0);
    const next = nextAnchor[i];
    // 같은 점수면 닻에 가까운 조각(방금 읽은 문장을 되풀이하거나 곧 읽을 문장)
    const distance = (from: number, to: number) =>
      Math.min(
        prev === null ? Infinity : Math.abs(from - prev),
        next === null ? Infinity : Math.abs(next - to),
      );
    let best: { from: number; to: number; score: number } | null = null;
    for (const [a, b] of ranges)
      for (let from = a; from <= b; from++)
        for (let to = from; to <= b && to < from + MAX_RUN; to++) {
          const run = units.slice(from, to + 1);
          const runPlain = run.map((u) => u.plain).join("");
          const runKana = run.map((u) => u.kana).join("");
          if (!compatible(plain, runPlain)) continue;
          for (const f of forms)
            for (const r of [runPlain, runKana]) {
              const score = similarity(f, r);
              const length = Math.min([...f].length, [...r].length);
              if (score < need(length, size)) continue;
              if (
                !best ||
                score > best.score ||
                (score === best.score &&
                  distance(from, to) < distance(best.from, best.to))
              )
                best = { from, to, score };
            }
        }
    if (!best) return;
    const picked: Sentence[] = [];
    for (const u of units.slice(best.from, best.to + 1))
      if (!picked.includes(ordered[u.k])) picked.push(ordered[u.k]);
    out[String(i)] = { ...makeCard(picked), inferred: true };
    prev = best.to;
  });
  return out;
}
