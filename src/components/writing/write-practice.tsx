"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { KeyHelp, SidePanel } from "@/components/keyboard/key-help";
import { SourceCredit } from "@/components/sources/source-credit";
import { cn } from "@/lib/cn";
import { sourceById } from "@/lib/sources/registry";
import {
  nextPosition,
  type Position,
  type PracticeStage,
  positionOf,
  STAGES,
  strokeFeedback,
} from "@/lib/writing/practice";
import type { WritingItem, WritingSet } from "@/lib/writing/sets";
import { judgeStroke, STROKE_RULES } from "@/lib/writing/stroke-check";
import { CharPicker, type ItemMark } from "./char-picker";
import { InkCanvas, type InkHandle, toLayoutUnits } from "./ink-canvas";
import { playDuration, StrokeGuide, StrokeSteps } from "./stroke-guide";
import { useReducedMotion } from "./use-reduced-motion";
import { useStrokeLayout } from "./use-stroke-layout";
import { WriteBox } from "./write-box";

export interface PracticeResult {
  item: WritingItem;
  stage: PracticeStage;
  /** 이 글자를 쓰는 동안 틀린 획 수 */
  mistakes: number;
}

/**
 * 써 보기: 글자 묶음에서 글자를 골라 획순대로 따라 쓴다. 획을 하나 그을 때마다 그 획이
 * 본보기의 다음 획과 순서·방향이 맞는지 바로 알려 주고, 틀리면 그 획만 지워 다시 긋게 한다.
 * 글자와 상관없이 돈다(획 데이터가 있는 묶음이면 무엇이든).
 */
export function WritePractice({
  sets,
  initialSetId,
  markOf,
  onComplete,
  sound,
  frame,
}: {
  /** 화면 틀. 본문과 PC 곁칸을 받아 그린다 */
  frame: (parts: { main: ReactNode; aside: ReactNode }) => ReactNode;
  sets: readonly WritingSet[];
  initialSetId?: string;
  markOf: (item: WritingItem) => ItemMark;
  onComplete: (r: PracticeResult) => void;
  /** 소리 단추(가나 소리 등). 없으면 그리지 않는다 */
  sound?: (item: WritingItem) => ReactNode;
}) {
  const [setId, setSetId] = useState(initialSetId ?? sets[0].id);
  const set = sets.find((x) => x.id === setId) ?? sets[0];
  const [at, setAt] = useState<Position>(() => positionOf(set, null));
  const [stage, setStage] = useState<PracticeStage>(1);
  const row = set.rows.find((r) => r.id === at.rowId) ?? set.rows[0];
  const item = row.items[at.index] ?? row.items[0];

  const guide = useStrokeLayout(item.text);
  const ink = useRef<InkHandle>(null);
  const [done, setDone] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [play, setPlay] = useState<number | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const reduced = useReducedMotion();
  const total = guide.layout?.strokes.length ?? 0;
  const complete = total > 0 && done >= total;

  const reset = useCallback(() => {
    ink.current?.clear();
    setDone(0);
    setMistakes(0);
    setHint(false);
    setFeedback(null);
    setResetKey((k) => k + 1);
  }, []);

  // 글자·단계가 바뀌면 새로 쓴다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 글자·단계가 바뀔 때만 비운다
  useEffect(() => {
    reset();
    setPlay(null);
  }, [item.text, stage]);

  useEffect(() => {
    if (play === null || total === 0) return;
    const t = setTimeout(() => setPlay(null), playDuration(total) + 400);
    return () => clearTimeout(t);
  }, [play, total]);

  const goNext = useCallback(() => setAt((p) => nextPosition(set, p)), [set]);

  // 키보드: → 다음 글자, Backspace 지우기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, reset]);

  const onStroke = (stroke: { x: number; y: number }[]) => {
    const layout = guide.layout;
    const box = ink.current?.box();
    if (!layout || !box || complete) return;
    const [mine] = toLayoutUnits([stroke], box, layout.size);
    const near = stage === 3 ? STROKE_RULES.nearFree : STROKE_RULES.near;
    const v = judgeStroke(mine, guide.points, done, layout.size, near);
    const f = strokeFeedback(v, done, total);
    setFeedback(f);
    if (!f.ok) {
      ink.current?.removeLast();
      setMistakes((m) => m + 1);
      setHint(true);
      return;
    }
    setHint(false);
    const next = done + 1;
    setDone(next);
    if (next >= total) onComplete({ item, stage, mistakes });
  };

  const showOrder = () => {
    if (reduced) setShowSteps((v) => !v);
    else setPlay((k) => (k ?? 0) + 1);
  };

  const source = sourceById(set.sourceId);
  const ghost = stage === 3 ? 0 : stage === 2 ? 0.14 : 0.18;
  // 혼자 쓰기에서 틀리면 다음 획만 슬쩍 보여 준다
  const nextStroke = complete ? null : stage === 1 || hint ? done : null;

  const steps = guide.layout ? <StrokeSteps layout={guide.layout} /> : null;
  // 글자 고르기: 폰은 칸 위, PC는 곁칸(칸을 화면 높이만큼 크게 두려고)
  const picker = (
    <CharPicker
      sets={sets}
      set={set}
      at={at}
      markOf={markOf}
      onSet={(id) => {
        const s = sets.find((x) => x.id === id);
        if (!s) return;
        setSetId(id);
        setAt(positionOf(s, null));
      }}
      onPick={setAt}
    />
  );

  return frame({
    main: (
      <div className="flex flex-1 flex-col gap-4 pt-2">
        <div className="lg:hidden">{picker}</div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span lang={set.lang} className="font-ja-serif text-3xl font-bold">
              {item.text}
            </span>
            <span className="text-ink-soft">
              {item.hint}
              {total > 0 ? ` · ${total}획` : ""}
            </span>
          </div>
          <div className="lg:hidden">{sound?.(item)}</div>
        </div>

        <fieldset className="grid min-w-0 grid-cols-3 gap-1.5 rounded-2xl bg-bg-raised p-1">
          <legend className="sr-only">단계</legend>
          {STAGES.map((x) => (
            <button
              key={x.stage}
              type="button"
              aria-pressed={stage === x.stage}
              onClick={() => setStage(x.stage)}
              className={cn(
                "rounded-xl py-2 text-sm",
                stage === x.stage ? "bg-bg text-ink shadow" : "text-ink-soft",
              )}
            >
              {x.stage} {x.label}
            </button>
          ))}
        </fieldset>

        <WriteBox className="max-w-[22rem] lg:max-w-[min(38rem,calc(100dvh-21rem))]">
          {guide.layout ? (
            <div className="absolute inset-0 text-ink">
              <StrokeGuide
                layout={guide.layout}
                ghost={ghost}
                next={nextStroke}
                playKey={play}
              />
            </div>
          ) : null}
          <InkCanvas
            ref={ink}
            label={`${item.text} 써 보기 칸`}
            disabled={complete || !guide.layout}
            resetKey={`${item.text}:${resetKey}`}
            onStroke={onStroke}
          />
        </WriteBox>

        {showSteps ? steps : null}

        <p
          aria-live="polite"
          className={cn(
            "min-h-[1.5rem] text-center text-sm",
            feedback
              ? feedback.ok
                ? "text-good"
                : "text-accent"
              : "text-ink-faint",
          )}
        >
          {complete
            ? mistakes === 0
              ? "다 썼어요! 획순·방향 모두 맞았어요."
              : `다 썼어요! 틀린 획 ${mistakes}번을 고쳐 썼어요.`
            : (feedback?.text ??
              (stage === 1
                ? "진한 획을 시작점(●)에서 화살표 쪽으로 따라 그어요."
                : stage === 2
                  ? "흐린 본보기를 보며 획순대로 써요."
                  : "빈 칸에 혼자 써요. 틀리면 다음 획을 보여 줘요."))}
        </p>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={showOrder}
            disabled={!guide.layout}
            className="h-12 rounded-2xl bg-bg-raised text-sm text-ink disabled:opacity-40"
          >
            획순 보기
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-12 rounded-2xl bg-bg-raised text-sm text-ink"
          >
            지우기
          </button>
          <button
            type="button"
            onClick={goNext}
            className={cn(
              "h-12 rounded-2xl text-sm font-bold",
              complete ? "bg-accent text-white" : "bg-bg-raised text-ink",
            )}
          >
            다음 글자 →
          </button>
        </div>
        {complete && stage < 3 ? (
          <button
            type="button"
            onClick={() => setStage((stage + 1) as PracticeStage)}
            className="text-sm text-ink-soft underline underline-offset-2"
          >
            다음 단계({STAGES[stage].label})로 이 글자 다시 쓰기
          </button>
        ) : null}

        <div className="space-y-3 lg:hidden">
          {!showSteps && steps ? (
            <details className="rounded-2xl border border-line p-4">
              <summary className="text-sm text-ink-soft">획순 그림</summary>
              <div className="mt-3">{steps}</div>
            </details>
          ) : null}
          {source ? <SourceCredit source={source} /> : null}
        </div>
      </div>
    ),
    aside: (
      <>
        <SidePanel title="글자 고르기">{picker}</SidePanel>
        <SidePanel title={`${item.text} 획순`}>
          <div className="flex items-center justify-between pb-3">
            <span className="text-sm text-ink-soft">
              {item.hint} · {total}획
            </span>
            {sound?.(item)}
          </div>
          {steps}
        </SidePanel>
        <KeyHelp
          items={[
            { key: "→", label: "다음 글자" },
            { key: "Backspace", label: "지우기" },
          ]}
        />
        {source ? <SourceCredit source={source} /> : null}
      </>
    ),
  });
}
