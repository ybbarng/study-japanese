import type { SongLine } from "./schema";

// 가사 줄과 재생 위치: 지금 어느 줄인지, 줄(또는 여러 줄)이 노래의 어디서 어디까지인지.

type Timed = Pick<SongLine, "start" | "end">;

export interface TimeRange {
  start: number;
  end: number;
}

/** 시작 시각을 맞춘 줄 수 */
export function timedCount(lines: readonly Timed[]): number {
  return lines.filter((l) => l.start !== undefined).length;
}

/**
 * i번째 줄이 끝나는 시각: 따로 적은 끝 시각, 없으면 뒤에서 처음 시각이 있는 줄의 시작,
 * 그것도 없으면 노래 길이. 모르면 null.
 */
export function lineEnd(
  lines: readonly Timed[],
  i: number,
  duration = Number.NaN,
): number | null {
  const line = lines[i];
  if (!line) return null;
  if (line.end !== undefined) return line.end;
  for (let j = i + 1; j < lines.length; j++) {
    const next = lines[j].start;
    if (next !== undefined) return next;
  }
  return Number.isFinite(duration) ? duration : null;
}

/**
 * 시각 t에 부르는 줄. 시작 시각이 t 이하인 줄 중 가장 늦게 시작한 줄이고,
 * 그 줄에 끝 시각을 따로 적었는데 지났으면(간주) -1. 첫 줄 전이거나 맞춘 줄이 없어도 -1.
 */
export function lineIndexAt(lines: readonly Timed[], t: number): number {
  let found = -1;
  let foundStart = Number.NEGATIVE_INFINITY;
  lines.forEach((line, i) => {
    if (
      line.start !== undefined &&
      line.start <= t &&
      line.start >= foundStart
    ) {
      found = i;
      foundStart = line.start;
    }
  });
  if (found === -1) return -1;
  const end = lines[found].end;
  return end !== undefined && t >= end ? -1 : found;
}

/** from번째 줄 시작부터 to번째 줄 끝까지. 시각을 몰라 정할 수 없으면 null */
export function rangeOf(
  lines: readonly Timed[],
  from: number,
  to: number,
  duration = Number.NaN,
): TimeRange | null {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const start = lines[a]?.start;
  const end = lineEnd(lines, b, duration);
  if (start === undefined || end === null || end <= start) return null;
  return { start, end };
}

/** 반복 중 재생 위치가 구간 끝에 닿았으면 되돌아갈 시각, 아니면 null */
export function loopBackTo(
  range: TimeRange | null,
  pos: number,
): number | null {
  if (!range) return null;
  return pos >= range.end ? range.start : null;
}

/** 시작 시각이 앞 줄보다 늦지 않은 줄(박자 맞추기에서 다시 볼 곳) */
export function timingIssues(lines: readonly Timed[]): number[] {
  const out: number[] = [];
  let prev = Number.NEGATIVE_INFINITY;
  lines.forEach((line, i) => {
    if (line.start === undefined) return;
    if (line.start <= prev) out.push(i);
    prev = Math.max(prev, line.start);
  });
  return out;
}

/** 0:07.3 같은 짧은 시각 표기 */
export function formatLineTime(sec: number | undefined): string {
  if (sec === undefined) return "--:--";
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
