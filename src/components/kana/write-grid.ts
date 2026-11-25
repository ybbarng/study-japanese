import { paintLayout } from "@/components/writing/path-points";
import type { Grid } from "@/lib/kana/write-check";
import type { StrokeLayout } from "@/lib/writing/layout";

/** 채점 격자 한 변의 칸 수. 쓰기 칸이 커도 작아도 같은 격자로 견준다 */
export const GRID_SIZE = 48;

export type Point = { x: number; y: number };

function offscreen(): CanvasRenderingContext2D | null {
  const c = document.createElement("canvas");
  c.width = GRID_SIZE;
  c.height = GRID_SIZE;
  return c.getContext("2d", { willReadFrequently: true });
}

function toGrid(ctx: CanvasRenderingContext2D): Grid {
  const { data } = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
  const cells = new Uint8Array(GRID_SIZE * GRID_SIZE);
  for (let i = 0; i < cells.length; i++)
    cells[i] = data[i * 4 + 3] > 96 ? 1 : 0;
  return { width: GRID_SIZE, height: GRID_SIZE, cells };
}

/** 쓴 획(쓰기 칸 기준 좌표)을 채점 격자로 */
export function inkGrid(
  strokes: Point[][],
  box: { width: number; height: number },
  lineWidth: number,
): Grid {
  const ctx = offscreen();
  if (!ctx) return { width: 0, height: 0, cells: new Uint8Array() };
  const k = GRID_SIZE / box.width;
  ctx.scale(k, GRID_SIZE / box.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#000";
  for (const stroke of strokes) {
    ctx.beginPath();
    ctx.arc(stroke[0].x, stroke[0].y, lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (const p of stroke.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  return toGrid(ctx);
}

/** 본보기 획 데이터를 화면과 같은 굵기로 칠해 채점 격자로 */
export function layoutGrid(layout: StrokeLayout, strokeWidth: number): Grid {
  const ctx = offscreen();
  if (!ctx) return { width: 0, height: 0, cells: new Uint8Array() };
  paintLayout(ctx, layout, GRID_SIZE, strokeWidth);
  return toGrid(ctx);
}

/**
 * 화면에 보이는 본보기 글자(span)를 같은 글꼴·크기·자리로 다시 그려 채점 격자로.
 * 인라인 span의 높이는 글꼴의 위·아래 높이(ascent+descent)이므로 그것으로 글자 바닥선을 잡는다.
 */
export function glyphGrid(el: HTMLElement, box: DOMRect): Grid {
  const ctx = offscreen();
  if (!ctx) return { width: 0, height: 0, cells: new Uint8Array() };
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  ctx.scale(GRID_SIZE / box.width, GRID_SIZE / box.height);
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  const m = ctx.measureText(el.textContent ?? "");
  const ascent = m.fontBoundingBoxAscent;
  const descent = m.fontBoundingBoxDescent;
  const baseline =
    rect.top - box.top + (rect.height - (ascent + descent)) / 2 + ascent;
  ctx.fillText(
    el.textContent ?? "",
    rect.left - box.left + rect.width / 2,
    baseline,
  );
  return toGrid(ctx);
}
