import type { StrokeTable } from "./types";

/** 배치할 때 글자 한 칸의 한 변. 데이터마다 viewBox가 달라도 이 크기로 맞춘다 */
export const CELL = 109;

/** 칸에 놓인 획 하나. 그릴 때 `translate(dx dy) scale(scale)`을 건다 */
export interface PlacedStroke {
  d: string;
  dx: number;
  dy: number;
  scale: number;
  /** 몇 번째 글자의 획인지(요음 きゃ처럼 글자가 둘일 때) */
  charIndex: number;
}

/** 쓰기 칸(정사각형, 한 변 `size`) 안에 놓인 글의 획 전부. 차례가 곧 쓰는 차례다 */
export interface StrokeLayout {
  text: string;
  size: number;
  strokes: PlacedStroke[];
}

/**
 * 글(글자 하나나 요음처럼 둘)을 정사각형 쓰기 칸에 늘어놓는다. 글자는 가로로 나란히,
 * 칸 높이 가운데에 둔다. 획 데이터가 없는 글자가 섞이면 null.
 */
export function layoutText(
  text: string,
  table: StrokeTable,
): StrokeLayout | null {
  const chars = [...text];
  if (chars.length === 0) return null;
  const size = CELL * chars.length;
  const dy = (size - CELL) / 2;
  const strokes: PlacedStroke[] = [];
  for (const [i, ch] of chars.entries()) {
    const data = table.get(ch);
    if (!data) return null;
    const scale = CELL / data.viewBox;
    for (const d of data.strokes)
      strokes.push({ d, dx: i * CELL, dy, scale, charIndex: i });
  }
  return { text, size, strokes };
}

/** SVG `transform` 값 */
export function transformOf(s: PlacedStroke): string {
  return `translate(${s.dx} ${s.dy}) scale(${s.scale})`;
}

/** 경로의 시작점(첫 M/m 명령의 좌표)을 칸 좌표로. 획 번호·시작점 표시에 쓴다 */
export function strokeStart(s: PlacedStroke): { x: number; y: number } {
  const m = /^\s*[Mm]\s*(-?\d*\.?\d+)[\s,]*(-?\d*\.?\d+)/.exec(s.d);
  const x = m ? Number(m[1]) : 0;
  const y = m ? Number(m[2]) : 0;
  return { x: s.dx + x * s.scale, y: s.dy + y * s.scale };
}
