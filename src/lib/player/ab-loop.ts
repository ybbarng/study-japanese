// A–B 구간 반복: 시작(A)과 끝(B)을 찍어 그 사이를 되풀이해 듣는다. 자막 줄과 상관없이
// 원하는 만큼(두세 문장이나 낱말 하나) 잡을 때 쓴다. 한 문장 반복(cue-loop.ts)과 함께 걸리지는 않는다.

export interface AbLoop {
  book: string;
  item: string;
  a: number;
  /** 아직 끝을 찍지 않았으면 null */
  b: number | null;
}

export interface AbAt {
  book: string;
  item: string;
  pos: number;
}

/** 이보다 짧은 구간은 잡지 않는다(실수로 두 번 누른 것) */
const MIN_SPAN_SEC = 0.3;
/** 끝을 이만큼 넘어 옮겨 가면(사용자가 다른 곳을 눌렀다) 반복을 푼다 */
const SLACK_AFTER = 1.5;

/** A–B 단추를 누를 때: 없음 → A 찍기 → B 찍기 → 풀기 */
export function nextAbLoop(current: AbLoop | null, at: AbAt): AbLoop | null {
  const same = current && current.book === at.book && current.item === at.item;
  if (!current || !same)
    return { book: at.book, item: at.item, a: at.pos, b: null };
  if (current.b !== null) return null;
  if (Math.abs(at.pos - current.a) < MIN_SPAN_SEC) return current;
  // A보다 앞에서 B를 찍었으면 둘을 바꾼다
  return at.pos > current.a
    ? { ...current, b: at.pos }
    : { ...current, a: at.pos, b: current.a };
}

export type AbStep =
  | { kind: "none" }
  | { kind: "clear" }
  | { kind: "back"; to: number };

/** 재생 위치가 바뀔 때마다: B에 닿으면 A로 돌아간다 */
export function abLoopStep(loop: AbLoop | null, at: AbAt): AbStep {
  if (!loop) return { kind: "none" };
  if (loop.book !== at.book || loop.item !== at.item) return { kind: "clear" };
  if (loop.b === null) return { kind: "none" };
  if (at.pos > loop.b + SLACK_AFTER) return { kind: "clear" };
  if (at.pos >= loop.b) return { kind: "back", to: loop.a };
  return { kind: "none" };
}
