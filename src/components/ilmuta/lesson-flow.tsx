"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { lessonLabel, registerLabel } from "@/lib/ilmuta/labels";
import type { LessonData } from "@/lib/ilmuta/server-data";
import { STEP_LABEL, type StepId } from "@/lib/ilmuta/steps";
import type { StepProps } from "./lesson-types";
import { StepConversation } from "./step-conversation";
import { StepLecture } from "./step-lecture";
import { StepListen } from "./step-listen";
import { StepPatterns } from "./step-patterns";
import { StepShadowing } from "./step-shadowing";
import { StepWords } from "./step-words";
import { StepWriting } from "./step-writing";
import { useListenIndex, usePlayerBarVisible } from "./use-player-bridge";

const STEP_VIEW: Record<StepId, ComponentType<StepProps>> = {
  lecture: StepLecture,
  words: StepWords,
  patterns: StepPatterns,
  conversation: StepConversation,
  shadowing: StepShadowing,
  listen: StepListen,
  writing: StepWriting,
};

interface Props {
  data: LessonData;
  steps: StepId[];
  initialStep: StepId;
}

/** 한 강의 학습 흐름: 위에 단계 표, 가운데 한 단계, 아래 엄지 자리에 이전·다음 */
export function LessonFlow({ data, steps, initialStep }: Props) {
  const { lesson } = data;
  const [step, setStep] = useState<StepId>(initialStep);
  const listens = useListenIndex(data.listens);
  const barVisible = usePlayerBarVisible();
  const at = steps.indexOf(step);
  const prev = at > 0 ? steps[at - 1] : null;
  const next = at < steps.length - 1 ? steps[at + 1] : null;
  const View = STEP_VIEW[step];
  const register = registerLabel(lesson.register);

  // 단계 표에서 지금 단계가 화면 밖이면 보이게 민다
  useEffect(() => {
    document
      .querySelector(`[data-step="${step}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [step]);

  const go = (s: StepId) => {
    setStep(s);
    window.history.replaceState(null, "", `?step=${s}`);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <header>
        <Link href="/ilmuta" className="text-sm text-ink-faint">
          ← 60강 지도
        </Link>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <span className="text-accent">{lessonLabel(lesson.no)}</span>
          {register ? (
            <span className="rounded-full border border-line px-1.5 text-xs text-ink-faint">
              {register}
            </span>
          ) : null}
        </p>
        {lesson.title ? (
          <h1
            lang="ja"
            className="mt-1 font-ja-serif text-4xl leading-tight font-bold"
          >
            {lesson.title}
          </h1>
        ) : (
          <h1 className="mt-1 text-3xl font-bold">일본어 무작정 따라하기</h1>
        )}
        {lesson.titleKo ? (
          <p className="mt-1 text-ink-soft">{lesson.titleKo}</p>
        ) : null}
      </header>

      {steps.length > 1 ? (
        <nav
          aria-label="학습 단계"
          className="-mx-5 mt-5 flex gap-1 overflow-x-auto px-5 pb-1 [scrollbar-width:none]"
        >
          {steps.map((s, i) => (
            <button
              key={s}
              data-step={s}
              type="button"
              onClick={() => go(s)}
              aria-current={s === step ? "step" : undefined}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm",
                s === step ? "bg-accent text-white" : "text-ink-soft",
              )}
            >
              {i + 1}. {STEP_LABEL[s]}
            </button>
          ))}
        </nav>
      ) : null}

      <section className="mt-5">
        <View data={data} listens={listens} />
      </section>

      {/* 아래 단추만큼 자리 비우기 */}
      <div aria-hidden className="h-28" />
      <div
        className={cn(
          "fixed inset-x-0 z-30 px-4",
          barVisible
            ? "bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.25rem)]"
            : "bottom-[max(env(safe-area-inset-bottom),0.75rem)]",
        )}
      >
        <div className="mx-auto flex max-w-md gap-2">
          {prev ? (
            <button
              type="button"
              onClick={() => go(prev)}
              className="h-14 rounded-2xl border border-line bg-bg/95 px-4 text-ink-soft backdrop-blur"
              aria-label={`이전 단계: ${STEP_LABEL[prev]}`}
            >
              ←
            </button>
          ) : null}
          {next ? (
            <button
              type="button"
              onClick={() => go(next)}
              className="h-14 flex-1 rounded-2xl border border-line bg-bg-raised/95 text-lg backdrop-blur"
            >
              다음: {STEP_LABEL[next]} →
            </button>
          ) : data.nextNo !== null ? (
            <Link
              href={`/ilmuta/${data.nextNo}`}
              className="grid h-14 flex-1 place-items-center rounded-2xl border border-line bg-bg-raised/95 text-lg backdrop-blur"
            >
              다음 강: {lessonLabel(data.nextNo)} →
            </Link>
          ) : (
            <Link
              href="/ilmuta"
              className="grid h-14 flex-1 place-items-center rounded-2xl border border-line bg-bg-raised/95 text-lg backdrop-blur"
            >
              지도로
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
