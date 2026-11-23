"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, SecondaryButton } from "./ui";

/**
 * 손가락으로 따라 쓰기. 흐린 본보기 위에 쓰고, "다 썼어요"를 누르면 본보기를 겹쳐 보여 준 뒤
 * 스스로 맞음·틀림을 고른다. 획순 데이터는 없어서 획순은 따지지 않는다.
 */
export function WritePad({
  char,
  romaji,
  onGrade,
}: {
  char: string;
  romaji: string;
  onGrade: (correct: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [ghost, setGhost] = useState(true);

  const clear = useCallback(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
    setRevealed(false);
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
      ctx.lineWidth = Math.max(8, rect.width / 28);
      ctx.strokeStyle = "#ece8df";
    }
    setHasInk(false);
    setRevealed(false);
  }, [char]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (revealed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    last.current = p;
    const ctx = e.currentTarget.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ece8df";
      ctx.fill();
    }
    setHasInk(true);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    const p = point(e);
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  };

  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between pb-3">
        <p className="text-ink-soft">
          <span className="text-2xl font-bold text-ink">{romaji}</span> 소리의
          글자 쓰기
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
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300",
            revealed
              ? "text-accent opacity-60"
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
              revealed && s.pop,
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
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-5">
        {revealed ? (
          <>
            <p className="text-center text-sm text-ink-soft">
              본보기와 겹쳐 보니 어떤가요?
            </p>
            <div className="flex gap-3">
              <SecondaryButton
                onClick={() => {
                  onGrade(false);
                  clear();
                }}
              >
                다시 쓸래요
              </SecondaryButton>
              <PrimaryButton onClick={() => onGrade(true)}>
                잘 썼어요
              </PrimaryButton>
            </div>
          </>
        ) : (
          <div className="flex gap-3">
            <SecondaryButton
              className="w-28 shrink-0"
              onClick={clear}
              disabled={!hasInk}
            >
              지우기
            </SecondaryButton>
            <PrimaryButton onClick={() => setRevealed(true)} disabled={!hasInk}>
              다 썼어요
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
