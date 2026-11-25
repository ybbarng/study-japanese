"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import {
  type StrokeLayout,
  strokeStart,
  transformOf,
} from "@/lib/writing/layout";
import s from "./writing.module.css";

/** 본보기 획 굵기(칸 한 변 109에 대해). 채점 격자도 이 굵기로 칠한다 */
export const GUIDE_WIDTH = 7;

/** 획 하나를 그리는 시간과 다음 획까지의 간격(ms) */
const DRAW_MS = 550;
const GAP_MS = 250;

export function playDuration(strokes: number): number {
  return strokes * (DRAW_MS + GAP_MS);
}

/**
 * 쓰기 칸을 덮는 본보기 획 그림. 칸과 같은 정사각형이라 칸 좌표와 그대로 맞는다.
 *   - ghost: 획 전체를 흐리게(진하기)
 *   - numbers: 획마다 시작점에 번호
 *   - next: 따라 쓰기에서 다음에 쓸 획(진하게, 시작점·방향 화살표)
 *   - done: 이미 쓴 획 수(그 획은 본보기에서 감춘다)
 *   - playKey: 바뀔 때마다 획순 애니메이션을 처음부터 그린다(null이면 그리지 않는다)
 */
export function StrokeGuide({
  layout,
  ghost = 0.16,
  numbers = false,
  next = null,
  done = 0,
  playKey = null,
  className,
}: {
  layout: StrokeLayout;
  /** 본보기 획의 진하기(0이면 감춘다) */
  ghost?: number;
  numbers?: boolean;
  next?: number | null;
  done?: number;
  playKey?: number | null;
  className?: string;
}) {
  const arrowId = useId();
  const n = layout.size;
  const label = n / 109;
  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
      aria-hidden
      data-stroke-guide={layout.text}
    >
      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="3.2"
          markerHeight="3.2"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
      </defs>
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="currentColor"
      >
        {layout.strokes.map((st, i) => (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: 획 차례가 곧 열쇠다
            key={i}
            d={st.d}
            transform={transformOf(st)}
            strokeWidth={GUIDE_WIDTH / st.scale}
            data-stroke={i}
            opacity={i < done ? 0 : ghost}
            className="transition-opacity duration-300"
          />
        ))}
        {next !== null && layout.strokes[next] ? (
          <path
            d={layout.strokes[next].d}
            transform={transformOf(layout.strokes[next])}
            strokeWidth={(GUIDE_WIDTH * 0.55) / layout.strokes[next].scale}
            stroke="var(--accent)"
            opacity={0.85}
            markerEnd={`url(#${arrowId})`}
            className={s.next}
            data-next-stroke={next}
          />
        ) : null}
      </g>
      {playKey !== null ? (
        <g
          key={playKey}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          stroke="var(--accent)"
          data-stroke-play
        >
          {layout.strokes.map((st, i) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: 획 차례가 곧 열쇠다
              key={i}
              d={st.d}
              transform={transformOf(st)}
              strokeWidth={GUIDE_WIDTH / st.scale}
              pathLength={1}
              className={s.draw}
              style={
                {
                  "--dur": `${DRAW_MS}ms`,
                  "--delay": `${i * (DRAW_MS + GAP_MS)}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </g>
      ) : null}
      {numbers || next !== null
        ? layout.strokes.map((st, i) => {
            if (!numbers && i !== next) return null;
            if (i < done) return null;
            const p = strokeStart(st);
            const strong = i === next;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: 획 차례가 곧 열쇠다
              <g key={i} data-stroke-number={i + 1}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={5.2 * label}
                  fill={strong ? "var(--accent)" : "var(--ink)"}
                  opacity={strong ? 1 : 0.75}
                />
                <text
                  x={p.x}
                  y={p.y}
                  dy="0.35em"
                  textAnchor="middle"
                  fontSize={6.5 * label}
                  fontWeight={700}
                  fill="var(--bg)"
                >
                  {i + 1}
                </text>
              </g>
            );
          })
        : null}
    </svg>
  );
}

/**
 * 획순을 단계별 정지 그림으로(획마다 한 칸, 그 칸에서 새로 쓰는 획을 진하게).
 * 움직임을 줄인 기기의 획순 보기와 PC 곁칸에 쓴다.
 */
export function StrokeSteps({
  layout,
  className,
}: {
  layout: StrokeLayout;
  className?: string;
}) {
  const n = layout.size;
  return (
    <ol
      className={cn("grid grid-cols-4 gap-2", className)}
      aria-label={`${layout.text} 획순 ${layout.strokes.length}획`}
      data-stroke-steps
    >
      {layout.strokes.map((_, k) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: 획 차례가 곧 열쇠다
          key={k}
          className="relative aspect-square rounded-xl bg-bg-sunken text-ink"
        >
          <svg viewBox={`0 0 ${n} ${n}`} className="h-full w-full" aria-hidden>
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {layout.strokes.slice(0, k + 1).map((st, i) => (
                <path
                  // biome-ignore lint/suspicious/noArrayIndexKey: 획 차례가 곧 열쇠다
                  key={i}
                  d={st.d}
                  transform={transformOf(st)}
                  strokeWidth={GUIDE_WIDTH / st.scale}
                  stroke={i === k ? "var(--accent)" : "currentColor"}
                  opacity={i === k ? 1 : 0.45}
                />
              ))}
            </g>
            {(() => {
              const p = strokeStart(layout.strokes[k]);
              return (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={6 * (n / 109)}
                  fill="var(--accent)"
                />
              );
            })()}
          </svg>
          <span className="absolute top-1 left-1.5 text-xs font-bold text-ink-faint">
            {k + 1}
          </span>
        </li>
      ))}
    </ol>
  );
}
