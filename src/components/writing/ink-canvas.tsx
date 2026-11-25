"use client";

import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { Pt } from "@/lib/writing/types";

export interface InkHandle {
  /** 그은 획(칸 왼쪽 위 기준 CSS 픽셀) */
  strokes: () => Pt[][];
  clear: () => void;
  /** 마지막 획만 지운다(써 보기에서 틀린 획을 되돌릴 때) */
  removeLast: () => void;
  /** 칸의 화면 자리 */
  box: () => DOMRect | null;
}

const INK = "#ece8df";

/** 칸 넓이에 맞춘 획 굵기 */
export function lineWidthOf(width: number): number {
  return Math.max(8, width / 28);
}

/**
 * 손가락·마우스·펜으로 쓰는 캔버스(pointer events). 획 하나를 다 그으면 `onStroke`를 부른다.
 * `resetKey`가 바뀌면 비운다.
 */
export function InkCanvas({
  ref,
  label,
  disabled = false,
  resetKey,
  onStroke,
  onStart,
}: {
  ref?: React.Ref<InkHandle>;
  label: string;
  disabled?: boolean;
  resetKey?: unknown;
  onStroke?: (stroke: Pt[], index: number) => void;
  onStart?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const drawing = useRef(false);

  const ctxOf = () => canvasRef.current?.getContext("2d") ?? null;

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    for (const st of strokes.current) {
      ctx.beginPath();
      ctx.arc(st[0].x, st[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(st[0].x, st[0].y);
      for (const p of st.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }, []);

  // 화면 밀도에 맞춰 캔버스 크기를 잡고, resetKey가 바뀌면 비운다
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey가 바뀔 때 새로 비운다
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = lineWidthOf(rect.width);
      ctx.strokeStyle = INK;
    }
    strokes.current = [];
  }, [resetKey]);

  useImperativeHandle(
    ref,
    () => ({
      strokes: () => strokes.current,
      clear: () => {
        strokes.current = [];
        redraw();
      },
      removeLast: () => {
        strokes.current = strokes.current.slice(0, -1);
        redraw();
      },
      box: () => canvasRef.current?.getBoundingClientRect() ?? null,
    }),
    [redraw],
  );

  const point = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    strokes.current = [...strokes.current, [p]];
    onStart?.();
    const ctx = ctxOf();
    if (ctx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = strokes.current[strokes.current.length - 1];
    if (!drawing.current || !stroke) return;
    const last = stroke[stroke.length - 1];
    const p = point(e);
    const ctx = ctxOf();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    stroke.push(p);
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const all = strokes.current;
    const last = all[all.length - 1];
    if (last) onStroke?.(last, all.length - 1);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      className="absolute inset-0 h-full w-full touch-none"
      aria-label={label}
    />
  );
}

/** CSS 픽셀 획을 칸 좌표(본보기 viewBox)로 */
export function toLayoutUnits(
  strokes: readonly (readonly Pt[])[],
  box: { width: number; height: number },
  size: number,
): Pt[][] {
  return strokes.map((st) =>
    st.map((p) => ({
      x: (p.x / box.width) * size,
      y: (p.y / box.height) * size,
    })),
  );
}
