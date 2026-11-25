import type { PlacedStroke, StrokeLayout } from "@/lib/writing/layout";
import type { Pt } from "@/lib/writing/types";

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * 본보기 획 경로를 칸 좌표의 점들로. 곡선 계산은 브라우저 SVG에 맡긴다
 * (getPointAtLength). 화면 밖에 잠깐 붙였다 뗀다.
 */
export function strokePoints(layout: StrokeLayout, perStroke = 32): Pt[][] {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.position = "absolute";
  svg.style.visibility = "hidden";
  document.body.append(svg);
  try {
    return layout.strokes.map((s) => sample(svg, s, perStroke));
  } finally {
    svg.remove();
  }
}

function sample(svg: SVGSVGElement, s: PlacedStroke, n: number): Pt[] {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", s.d);
  svg.append(path);
  const total = path.getTotalLength();
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = path.getPointAtLength((total * i) / (n - 1));
    out.push({ x: s.dx + p.x * s.scale, y: s.dy + p.y * s.scale });
  }
  path.remove();
  return out;
}

/** 캔버스에 본보기 획을 같은 자리·굵기로 칠한다(채점 격자용) */
export function paintLayout(
  ctx: CanvasRenderingContext2D,
  layout: StrokeLayout,
  pixels: number,
  strokeWidth: number,
) {
  const k = pixels / layout.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#000";
  for (const s of layout.strokes) {
    ctx.setTransform(k * s.scale, 0, 0, k * s.scale, k * s.dx, k * s.dy);
    ctx.lineWidth = strokeWidth / s.scale;
    ctx.stroke(new Path2D(s.d));
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
