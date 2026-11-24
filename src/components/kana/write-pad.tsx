"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { strokeCounts } from "@/lib/kana/strokes";
import { checkWriting, type WriteCheck } from "@/lib/kana/write-check";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, SecondaryButton } from "./ui";
import { glyphGrid, inkGrid, type Point } from "./write-grid";

/**
 * 손가락으로 따라 쓰기. 흐린 본보기 위에 쓰고 "다 썼어요"를 누르면 채점한다:
 * 획 수가 맞는지, 쓴 선이 본보기 글자 위에 놓였는지, 본보기에서 빠진 곳이 없는지(write-check.ts).
 * 틀리면 그 자리에서 틀림으로 기록하고(onGrade(false)) 까닭과 본보기를 겹쳐 보여 준 뒤 다시 쓰게 한다.
 * 두 번 넘게 틀리면 기록 없이 넘어갈 수 있다(채점이 손글씨를 잘못 볼 때 갇히지 않게).
 * 획 방향은 아직 보지 않는다.
 */
export function WritePad({
  char,
  romaji,
  onGrade,
  onSkip,
}: {
  char: string;
  romaji: string;
  /** 맞으면 다음 글자로, 틀리면 같은 글자에 머문다 */
  onGrade: (correct: boolean) => void;
  onSkip: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const strokes = useRef<Point[][]>([]);
  const [strokeCount, setStrokeCount] = useState(0);
  const [result, setResult] = useState<WriteCheck | null>(null);
  const [failures, setFailures] = useState(0);
  const [ghost, setGhost] = useState(true);
  const expected = useMemo(() => strokeCounts(char), [char]);

  const clear = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    strokes.current = [];
    setStrokeCount(0);
    setResult(null);
  }, []);

  // 화면 밀도에 맞춰 캔버스 크기를 잡는다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 글자가 바뀌면 새로 비운다
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
      ctx.strokeStyle = "#ece8df";
    }
    strokes.current = [];
    setStrokeCount(0);
    setResult(null);
    setFailures(0);
  }, [char]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (result) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    strokes.current.push([p]);
    setStrokeCount(strokes.current.length);
    const ctx = e.currentTarget.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ece8df";
      ctx.fill();
    }
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = strokes.current[strokes.current.length - 1];
    if (!drawing.current || !stroke) return;
    const last = stroke[stroke.length - 1];
    const ctx = e.currentTarget.getContext("2d");
    const p = point(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    stroke.push(p);
  };

  const up = () => {
    drawing.current = false;
  };

  const check = () => {
    const c = canvasRef.current;
    const glyphEl = ghostRef.current?.querySelector("span");
    if (!c || !glyphEl) return;
    const box = c.getBoundingClientRect();
    const r = checkWriting({
      ink: inkGrid(strokes.current, box, lineWidthOf(box.width)),
      glyph: glyphGrid(glyphEl, box),
      strokesDrawn: strokes.current.length,
      strokeCounts: expected,
    });
    setResult(r);
    if (!r.ok) {
      setFailures((n) => n + 1);
      onGrade(false);
    }
  };

  const hasInk = strokeCount > 0;
  const starts = result ? strokes.current.map((st) => st[0]) : [];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between pb-3">
        <p className="text-ink-soft">
          ‘<span className="text-2xl font-bold text-ink">{romaji}</span>’ 소리
          글자를 써 보세요
          {expected.length > 0 ? (
            <span className="ml-2 text-sm">· {expected[0]}획</span>
          ) : null}
        </p>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={ghost}
            onChange={(e) => setGhost(e.target.checked)}
            className="h-5 w-5 accent-[var(--accent)]"
          />
          본보기
        </label>
      </div>
      {/* PC에서는 마우스로 크게 쓰도록 칸을 키운다(획 굵기는 칸 넓이에 맞춰 바뀐다) */}
      <div className="relative mx-auto aspect-square w-full max-w-[22rem] cursor-crosshair overflow-hidden rounded-3xl bg-bg-sunken lg:max-w-[min(34rem,calc(100dvh-20rem))]">
        {/* 칸 안내선 */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 right-0 left-0 border-t border-dashed border-line" />
          <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-line" />
        </div>
        <div
          ref={ghostRef}
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            result
              ? result.ok
                ? "text-good opacity-50"
                : "text-accent opacity-60"
              : ghost
                ? "opacity-[0.13]"
                : "opacity-0",
          )}
        >
          <Glyph
            className={cn(
              char.length > 1
                ? "text-[9rem] lg:text-[min(13rem,calc((100dvh-20rem)*0.4))]"
                : "text-[15rem] lg:text-[min(23rem,calc((100dvh-20rem)*0.68))]",
              "font-medium",
              result && s.pop,
            )}
          >
            {char}
          </Glyph>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="absolute inset-0 h-full w-full touch-none"
          aria-label={`${char} 쓰기 칸`}
        />
        {/* 채점 뒤: 내가 그은 획마다 시작점에 순서 번호 */}
        {starts.map((p, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 획 순서가 곧 번호다
            key={i}
            className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink text-xs font-bold text-bg"
            style={{ left: p.x, top: p.y }}
          >
            {i + 1}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-ink-faint" aria-live="polite">
        {hasInk && !result ? `${strokeCount}획 그음` : " "}
      </p>
      <div className="mt-auto flex flex-col gap-3 pt-3">
        {result ? (
          result.ok ? (
            <>
              <p className="text-center font-medium text-good">
                잘 썼어요! {result.strokesDrawn}획, 모양도 본보기와 맞아요.
              </p>
              <PrimaryButton onClick={() => onGrade(true)}>
                다음 글자
              </PrimaryButton>
            </>
          ) : (
            <>
              <ul className="space-y-1 text-center text-sm text-accent">
                {result.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="text-center text-xs text-ink-faint">
                숫자는 내가 그은 획의 순서예요. 본보기와 견주어 보고 다시 써
                보세요.
              </p>
              <div className="flex gap-3">
                {failures >= 2 ? (
                  <SecondaryButton className="w-28 shrink-0" onClick={onSkip}>
                    넘어가기
                  </SecondaryButton>
                ) : null}
                <PrimaryButton onClick={clear}>다시 쓰기</PrimaryButton>
              </div>
            </>
          )
        ) : (
          <div className="flex gap-3">
            <SecondaryButton
              className="w-28 shrink-0"
              onClick={clear}
              disabled={!hasInk}
            >
              지우기
            </SecondaryButton>
            <PrimaryButton onClick={check} disabled={!hasInk}>
              다 썼어요
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

/** 칸 넓이에 맞춘 획 굵기 */
function lineWidthOf(width: number): number {
  return Math.max(8, width / 28);
}
