"use client";

import { useEffect, useRef, useState } from "react";
import { SourceCredit } from "@/components/sources/source-credit";
import {
  InkCanvas,
  type InkHandle,
  lineWidthOf,
  toLayoutUnits,
} from "@/components/writing/ink-canvas";
import {
  GUIDE_WIDTH,
  playDuration,
  StrokeGuide,
  StrokeSteps,
} from "@/components/writing/stroke-guide";
import { useReducedMotion } from "@/components/writing/use-reduced-motion";
import { useStrokeLayout } from "@/components/writing/use-stroke-layout";
import { WriteBox } from "@/components/writing/write-box";
import { checkWriting, type WriteCheck } from "@/lib/kana/write-check";
import { sourceById } from "@/lib/sources/registry";
import { judgeStrokes } from "@/lib/writing/stroke-check";
import s from "./kana.module.css";
import { cn, Glyph, PrimaryButton, SecondaryButton } from "./ui";
import { glyphGrid, inkGrid, layoutGrid } from "./write-grid";

const KANJIVG = sourceById("kanjivg");

/**
 * 손가락으로 따라 쓰기. 흐린 본보기(KanjiVG 획) 위에 획 번호·시작점이 붙고, "획순 보기"를 누르면
 * 획을 하나씩 그려 보인다. "다 썼어요"를 누르면 채점한다: 획 수, 쓴 선이 본보기 위에 놓였는지,
 * 빠진 곳이 없는지(write-check.ts), 획마다 순서·방향이 본보기와 같은지(writing/stroke-check.ts).
 * 틀리면 그 자리에서 틀림으로 기록하고(onGrade(false)) 까닭과 본보기를 겹쳐 보여 준 뒤 다시 쓰게 한다.
 * 두 번 넘게 틀리면 기록 없이 넘어갈 수 있다(채점이 손글씨를 잘못 볼 때 갇히지 않게).
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
  const ink = useRef<InkHandle>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const [strokeCount, setStrokeCount] = useState(0);
  const [result, setResult] = useState<WriteCheck | null>(null);
  const [failures, setFailures] = useState(0);
  const [ghost, setGhost] = useState(true);
  const [play, setPlay] = useState<number | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const reduced = useReducedMotion();
  const guide = useStrokeLayout(char);
  const expected = guide.counts;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 글자가 바뀌면 새로 비운다
  useEffect(() => {
    setStrokeCount(0);
    setResult(null);
    setFailures(0);
    setPlay(null);
    setShowSteps(false);
  }, [char]);

  // 획순 보기가 끝나면 애니메이션 그림을 걷는다
  useEffect(() => {
    if (play === null || !guide.layout) return;
    const t = setTimeout(
      () => setPlay(null),
      playDuration(guide.layout.strokes.length) + 400,
    );
    return () => clearTimeout(t);
  }, [play, guide.layout]);

  const clear = () => {
    ink.current?.clear();
    setStrokeCount(0);
    setResult(null);
    setResetKey((k) => k + 1);
  };

  const showOrder = () => {
    if (reduced) setShowSteps((v) => !v);
    else setPlay((k) => (k ?? 0) + 1);
  };

  const check = () => {
    const box = ink.current?.box();
    const drawn = ink.current?.strokes() ?? [];
    if (!box || drawn.length === 0) return;
    const layout = guide.layout;
    let glyph = null;
    if (layout) glyph = layoutGrid(layout, GUIDE_WIDTH);
    else {
      const glyphEl = ghostRef.current?.querySelector("span");
      if (glyphEl) glyph = glyphGrid(glyphEl, box);
    }
    if (!glyph) return;
    const strokeIssues = layout
      ? judgeStrokes(
          toLayoutUnits(drawn, box, layout.size),
          guide.points,
          layout.size,
        )
      : [];
    const r = checkWriting({
      ink: inkGrid(drawn, box, lineWidthOf(box.width)),
      glyph,
      strokesDrawn: drawn.length,
      strokeCounts: expected,
      strokeIssues,
    });
    setResult(r);
    setPlay(null);
    if (!r.ok) {
      setFailures((n) => n + 1);
      onGrade(false);
    }
  };

  const hasInk = strokeCount > 0;
  const drawnStrokes = result ? (ink.current?.strokes() ?? []) : [];
  const wrong = new Set(result?.strokeIssues.map((i) => i.index));
  const ghostLevel = result ? (result.ok ? 0.5 : 0.6) : ghost ? 0.16 : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 pb-3">
        <p className="text-ink-soft">
          ‘<span className="text-2xl font-bold text-ink">{romaji}</span>’ 소리
          글자를 써 보세요
          {expected.length > 0 ? (
            <span className="ml-2 text-sm">· {expected[0]}획</span>
          ) : null}
        </p>
        <label className="flex shrink-0 items-center gap-2 text-sm text-ink-soft">
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
      <WriteBox className="max-w-[22rem] lg:max-w-[min(34rem,calc(100dvh-20rem))]">
        {guide.layout ? (
          <div
            className={cn(
              "absolute inset-0",
              result ? (result.ok ? "text-good" : "text-accent") : "text-ink",
              result && s.pop,
            )}
          >
            <StrokeGuide
              layout={guide.layout}
              ghost={ghostLevel}
              numbers={ghost && !result}
              playKey={play}
            />
          </div>
        ) : (
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
        )}
        <InkCanvas
          ref={ink}
          label={`${char} 쓰기 칸`}
          disabled={!!result}
          resetKey={`${char}:${resetKey}`}
          onStroke={(_, i) => setStrokeCount(i + 1)}
        />
        {/* 채점 뒤: 내가 그은 획마다 시작점에 순서 번호(순서·방향이 틀린 획은 붉게) */}
        {drawnStrokes.map((st, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 획 순서가 곧 번호다
            key={i}
            className={cn(
              "pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-bg",
              wrong.has(i) ? "bg-accent" : "bg-ink",
            )}
            style={{ left: st[0].x, top: st[0].y }}
          >
            {i + 1}
          </span>
        ))}
      </WriteBox>
      {showSteps && guide.layout ? (
        <StrokeSteps
          layout={guide.layout}
          className="mx-auto mt-3 w-full max-w-[22rem]"
        />
      ) : null}
      <div className="mt-2 flex items-center justify-between text-sm text-ink-faint">
        <span aria-live="polite">
          {hasInk && !result ? `${strokeCount}획 그음` : " "}
        </span>
        {guide.layout ? (
          <button
            type="button"
            onClick={showOrder}
            className="rounded-full px-3 py-1 text-ink-soft underline-offset-2 active:bg-bg-raised lg:hover:underline"
          >
            획순 보기
          </button>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-3">
        {result ? (
          result.ok ? (
            <>
              <p className="text-center font-medium text-good">
                잘 썼어요! {result.strokesDrawn}획, 모양과 획순도 본보기와
                맞아요.
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
        {guide.layout && KANJIVG ? (
          <SourceCredit source={KANJIVG} className="mt-1" />
        ) : null}
      </div>
    </div>
  );
}
