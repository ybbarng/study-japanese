import type { Pt } from "./types";

export function lengthOf(points: readonly Pt[]): number {
  let n = 0;
  for (let i = 1; i < points.length; i++)
    n += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
  return n;
}

/** 선을 길이가 고르게 `n`개 점으로 다시 찍는다(손으로 그은 선은 점 간격이 들쭉날쭉하다) */
export function resample(points: readonly Pt[], n: number): Pt[] {
  if (points.length === 0) return [];
  const total = lengthOf(points);
  if (points.length === 1 || total === 0)
    return Array.from({ length: n }, () => ({ ...points[0] }));
  const out: Pt[] = [{ ...points[0] }];
  const step = total / (n - 1);
  let want = step;
  let walked = 0;
  for (let i = 1; i < points.length && out.length < n - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (seg > 0 && walked + seg >= want && out.length < n - 1) {
      const t = (want - walked) / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      want += step;
    }
    walked += seg;
  }
  out.push({ ...points[points.length - 1] });
  return out;
}

/** 같은 수로 찍은 두 선에서 차례가 같은 점끼리의 평균 거리 */
export function meanDistance(a: readonly Pt[], b: readonly Pt[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++)
    sum += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  return a.length === 0 ? 0 : sum / a.length;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boundsOf(strokes: readonly (readonly Pt[])[]): Box {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const s of strokes)
    for (const p of s) {
      x1 = Math.min(x1, p.x);
      y1 = Math.min(y1, p.y);
      x2 = Math.max(x2, p.x);
      y2 = Math.max(y2, p.y);
    }
  if (x1 === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

/**
 * 획 묶음을 `to` 상자에 겹치게 옮기고 늘린다(가운데를 맞추고 긴 변 기준으로 같은 비율).
 * 본보기 없이 쓴 글씨는 칸 안 자리·크기가 본보기와 달라서, 모양과 차례만 견주려고 맞춘다.
 */
export function fitTo(strokes: readonly (readonly Pt[])[], to: Box): Pt[][] {
  const from = boundsOf(strokes);
  const k = Math.max(to.w, to.h) / Math.max(from.w, from.h, 1e-6);
  const cx = from.x + from.w / 2;
  const cy = from.y + from.h / 2;
  const tx = to.x + to.w / 2;
  const ty = to.y + to.h / 2;
  return strokes.map((s) =>
    s.map((p) => ({ x: tx + (p.x - cx) * k, y: ty + (p.y - cy) * k })),
  );
}
