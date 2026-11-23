import type { SongLine } from "./schema";
import { rangeOf, type TimeRange } from "./timing";

// 반복 고르기: 끄기, 한 줄, 여러 줄 구간.

export type LoopChoice =
  | { kind: "off" }
  | { kind: "line"; index: number }
  | { kind: "range"; from: number; to: number };

export const LOOP_OFF: LoopChoice = { kind: "off" };

/** 고른 반복의 시간 구간. 끄거나 시각을 몰라 정할 수 없으면 null */
export function loopRange(
  lines: readonly Pick<SongLine, "start" | "end">[],
  choice: LoopChoice,
  duration = Number.NaN,
): TimeRange | null {
  if (choice.kind === "off") return null;
  if (choice.kind === "line")
    return rangeOf(lines, choice.index, choice.index, duration);
  return rangeOf(lines, choice.from, choice.to, duration);
}

/** 이 줄이 반복 구간 안인지(화면에 표시) */
export function inLoop(choice: LoopChoice, index: number): boolean {
  if (choice.kind === "off") return false;
  if (choice.kind === "line") return choice.index === index;
  const [a, b] =
    choice.from <= choice.to
      ? [choice.from, choice.to]
      : [choice.to, choice.from];
  return index >= a && index <= b;
}
