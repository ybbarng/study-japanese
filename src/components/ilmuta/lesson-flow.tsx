"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useState } from "react";
import { OfflineButton } from "@/components/offline/offline-button";
import { StickyPanel } from "@/components/shell/page-frame";
import { cn } from "@/lib/cn";
import { lessonLabel, registerLabel } from "@/lib/ilmuta/labels";
import type { LessonData } from "@/lib/ilmuta/server-data";
import { STEP_LABEL, type StepId } from "@/lib/ilmuta/steps";
import { ilmutaPack } from "@/lib/offline/pack";
import { LessonAside } from "./lesson-aside";
import type { StepProps } from "./lesson-types";
import { StepConversation } from "./step-conversation";
import { StepLecture } from "./step-lecture";
import { StepListen } from "./step-listen";
import { StepNav } from "./step-nav";
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

/**
 * 한 강의 학습 흐름.
 * 폰: 위에 단계 표, 가운데 한 단계, 아래 엄지 자리에 이전·다음.
 * PC(lg): 왼쪽 단계 내용, 오른쪽 고정 곁칸에 강의 재생·자막(쓰기 단계면 쓰기 참고).
 * 넓은 PC(xl): 단계 표가 맨 왼쪽 세로 목차가 된다.
 */
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

  // 단계 표에서 지금 단계가 화면 밖이면 보이게 민다(가로 단계 표일 때)
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
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),1.25rem)] lg:grid lg:max-w-[96rem] lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_auto_auto_1fr] lg:gap-x-8 lg:px-10 lg:pt-8 xl:grid-cols-[8.5rem_minmax(0,1fr)_22rem] 2xl:grid-cols-[9rem_minmax(0,1fr)_24rem] xl:grid-rows-[auto_auto_1fr]">
      <header className="lg:col-start-1 lg:row-start-1 xl:col-start-2">
        <Link href="/ilmuta" className="text-sm text-ink-faint lg:hidden">
          ← 60강 지도
        </Link>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft lg:mt-0">
          <Link href="/ilmuta" className="hidden text-ink-faint lg:inline">
            60강 지도 /
          </Link>
          <span className="text-accent">{lessonLabel(lesson.no)}</span>
          {register ? (
            <span className="rounded-full border border-line px-1.5 text-xs text-ink-faint">
              {register}
            </span>
          ) : null}
        </p>
        <div className="2xl:flex 2xl:items-end 2xl:justify-between 2xl:gap-6">
          <div className="min-w-0">
            {lesson.title ? (
              <h1
                lang="ja"
                className="mt-1 font-ja-serif text-4xl leading-tight font-bold lg:text-5xl"
              >
                {lesson.title}
              </h1>
            ) : (
              <h1 className="mt-1 text-3xl font-bold">
                일본어 무작정 따라하기
              </h1>
            )}
            {lesson.titleKo ? (
              <p className="mt-1 text-ink-soft lg:text-lg">{lesson.titleKo}</p>
            ) : null}
          </div>
          <OfflineButton
            pack={ilmutaPack(lesson)}
            className="mt-4 lg:max-w-xl 2xl:w-80 2xl:shrink-0"
          />
        </div>
      </header>

      {steps.length > 1 ? (
        <StepNav
          steps={steps}
          current={step}
          onGo={go}
          className="lg:col-start-1 lg:row-start-2 xl:row-span-3 xl:row-start-1"
        />
      ) : null}

      <section className="mt-5 lg:col-start-1 lg:row-start-3 lg:mt-6 xl:col-start-2 xl:row-start-2">
        <View data={data} listens={listens} />
      </section>

      {/* 아래 단추만큼 자리 비우기(폰) */}
      <div aria-hidden className="h-28 lg:hidden" />
      <div
        className={cn(
          "fixed inset-x-0 z-30 px-4 lg:static lg:col-start-1 lg:row-start-4 lg:mt-10 lg:self-start lg:px-0 lg:pb-10 xl:col-start-2 xl:row-start-3",
          barVisible
            ? "bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.25rem)]"
            : "bottom-[max(env(safe-area-inset-bottom),0.75rem)]",
        )}
      >
        <div className="mx-auto flex max-w-md gap-2 lg:max-w-none">
          {prev ? (
            <button
              type="button"
              onClick={() => go(prev)}
              className="h-14 rounded-2xl border border-line bg-bg/95 px-4 text-ink-soft backdrop-blur lg:hover:bg-bg-raised"
              aria-label={`이전 단계: ${STEP_LABEL[prev]}`}
            >
              ←
            </button>
          ) : null}
          {next ? (
            <button
              type="button"
              onClick={() => go(next)}
              className="h-14 flex-1 rounded-2xl border border-line bg-bg-raised/95 text-lg backdrop-blur lg:hover:border-accent"
            >
              다음: {STEP_LABEL[next]} →
            </button>
          ) : data.nextNo !== null ? (
            <Link
              href={`/ilmuta/${data.nextNo}`}
              className="grid h-14 flex-1 place-items-center rounded-2xl border border-line bg-bg-raised/95 text-lg backdrop-blur lg:hover:border-accent"
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

      <aside
        aria-label={step === "writing" ? "쓰기 참고" : "강의와 자막"}
        className="hidden lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:block xl:col-start-3 xl:row-span-3"
      >
        <StickyPanel className="top-8 max-h-[calc(100dvh-8rem)]">
          <LessonAside data={data} listens={listens} step={step} />
        </StickyPanel>
      </aside>
    </main>
  );
}
