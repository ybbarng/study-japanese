/**
 * 오디오를 말소리 조각으로 나눈다. 무음은 ffmpeg `silencedetect`가 찾고,
 * 여기서는 그 결과를 조각 목록으로 바꾸는 순수 계산만 한다.
 */

export type Span = { start: number; end: number };

/** ffmpeg `silencedetect` 로그(stderr)에서 무음 구간을 뽑는다. 끝이 없는 마지막 무음은 `duration`에서 닫는다. */
export function parseSilences(log: string, duration: number): Span[] {
  const out: Span[] = [];
  let open: number | undefined;
  for (const m of log.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const t = Number(m[2]);
    if (m[1] === "start") open = Math.max(0, t);
    else if (open !== undefined) {
      out.push({ start: open, end: t });
      open = undefined;
    }
  }
  if (open !== undefined) out.push({ start: open, end: duration });
  return out;
}

export type RegionOptions = {
  /** 말소리 앞뒤로 붙일 여유(초). 무음 안쪽으로만 넓힌다 */
  pad: number;
  /** 이보다 짧은 말소리는 버린다(초) */
  minLength: number;
};

/** 무음 사이의 말소리 구간. 앞뒤로 `pad`만큼 넓히되 무음의 절반을 넘지 않는다. */
export function speechRegions(
  silences: Span[],
  duration: number,
  { pad, minLength }: RegionOptions,
): Span[] {
  const sorted = [...silences].sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  let cursor = 0;
  let prevSilence: Span | undefined;
  const push = (start: number, end: number, before?: Span, after?: Span) => {
    if (end - start < minLength) return;
    const lo = before
      ? Math.max(before.start + (before.end - before.start) / 2, start - pad)
      : 0;
    const hi = after
      ? Math.min(after.end - (after.end - after.start) / 2, end + pad)
      : duration;
    out.push({ start: Math.max(0, lo), end: Math.min(duration, hi) });
  };
  for (const s of sorted) {
    if (s.start > cursor) push(cursor, s.start, prevSilence, s);
    cursor = Math.max(cursor, s.end);
    prevSilence = s;
  }
  if (duration > cursor) push(cursor, duration, prevSilence, undefined);
  return out;
}

/**
 * `maxLength`보다 긴 조각을 자른다. 자를 곳은 조각 안의 짧은 무음(`fineSilences`) 가운데
 * 가운데에 가장 가까운 것이고, 없으면 가운데를 그대로 자른다.
 */
export function splitLongRegions(
  regions: Span[],
  fineSilences: Span[],
  maxLength: number,
): Span[] {
  const out: Span[] = [];
  const split = (r: Span) => {
    if (r.end - r.start <= maxLength) {
      out.push(r);
      return;
    }
    const mid = (r.start + r.end) / 2;
    const margin = Math.min(1, (r.end - r.start) / 4);
    let cut = mid;
    let best = Number.POSITIVE_INFINITY;
    for (const s of fineSilences) {
      const c = (s.start + s.end) / 2;
      if (c <= r.start + margin || c >= r.end - margin) continue;
      if (Math.abs(c - mid) < best) {
        best = Math.abs(c - mid);
        cut = c;
      }
    }
    split({ start: r.start, end: cut });
    split({ start: cut, end: r.end });
  };
  for (const r of regions) split(r);
  return out;
}
