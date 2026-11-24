"use client";

import Link from "next/link";
import {
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { OfflineButton } from "@/components/offline/offline-button";
import { StickyPanel } from "@/components/shell/page-frame";
import { followStep } from "@/lib/ilmuta/follow-step";
import { lessonLabel, registerLabel } from "@/lib/ilmuta/labels";
import { currentSection } from "@/lib/ilmuta/sections";
import type { LessonData } from "@/lib/ilmuta/server-data";
import { STEP_LABEL, type StepId } from "@/lib/ilmuta/steps";
import { ilmutaPack } from "@/lib/offline/pack";
import { LessonAside, LessonPlayerTop } from "./lesson-aside";
import type { StepProps } from "./lesson-types";
import { StepConversation } from "./step-conversation";
import { StepLecture } from "./step-lecture";
import { StepListen } from "./step-listen";
import { StepNav } from "./step-nav";
import { StepPatterns } from "./step-patterns";
import { StepShadowing } from "./step-shadowing";
import { StepWords } from "./step-words";
import { StepWriting } from "./step-writing";
import { useListenIndex, useNowPlaying } from "./use-player-bridge";

const STEP_VIEW: Record<StepId, ComponentType<StepProps>> = {
  lecture: StepLecture,
  words: StepWords,
  patterns: StepPatterns,
  conversation: StepConversation,
  shadowing: StepShadowing,
  listen: StepListen,
  writing: StepWriting,
};

/** 구역 머리가 이 선(화면 위에서부터)을 넘으면 그 구역을 읽는 중으로 본다(위에 붙은 재생기 아래쯤) */
const SECTION_LINE = 0.3;

function sectionEl(s: StepId): HTMLElement | null {
  return document.getElementById(`step-${s}`);
}

/**
 * 한 강의 교재 영역. 단계별 화면을 넘기지 않고 강의 → 단어 → … → 쓰기를 한 장으로 이어 읽는다
 * (나중에 퀴즈·드릴을 그 자리에 끼워 넣을 수 있게 구역마다 이어 붙인다).
 * 재생기는 늘 보인다: 폰은 화면 위에 붙고(내려 읽으면 한 줄로 접힌다), PC(lg)는 오른쪽 고정 칸 맨 위에
 * 재생기와 지금 하는 말·자막을 두고 가운데를 교재로 넓게 쓴다. 넓은 PC(xl)는 단계 표가 왼쪽 세로 목차가 된다.
 * 단계 표는 그 구역으로 굴려 가는 목차이고, 지금 읽는 구역을 표시한다.
 */
export function LessonFlow({
  data,
  steps,
  initialStep,
  footer,
}: {
  data: LessonData;
  steps: StepId[];
  initialStep: StepId;
  /** 강 내용 아래 붙는 것(출처 표시) */
  footer?: ReactNode;
}) {
  const { lesson } = data;
  const [current, setCurrent] = useState<StepId>(initialStep);
  const listens = useListenIndex(data.listens);
  const register = registerLabel(lesson.register);

  // 지금 읽는 구역: 굴릴 때마다 구역 머리 위치로 정한다
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const tops = steps.map(
        (s) => sectionEl(s)?.getBoundingClientRect().top ?? 0,
      );
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      const i = currentSection(
        tops,
        window.innerHeight * SECTION_LINE,
        atBottom,
      );
      if (i >= 0) setCurrent(steps[i]);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [steps]);

  // 단계 표에서 지금 구역이 화면 밖이면 보이게 민다(가로 단계 표일 때)
  useEffect(() => {
    document
      .querySelector(`[data-step="${current}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);

  const go = useCallback((s: StepId, smooth = true) => {
    setCurrent(s);
    window.history.replaceState(null, "", `?step=${s}`);
    sectionEl(s)?.scrollIntoView({
      block: "start",
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // ?step=으로 들어오면 그 구역부터 보인다
  // biome-ignore lint/correctness/useExhaustiveDependencies: 처음 한 번만
  useEffect(() => {
    if (initialStep !== steps[0]) go(initialStep, false);
  }, []);

  // 강의가 끝나 대기열이 이 강 예문으로 넘어가면, 소리를 따라 보고 있던 화면도 그 예문 구역으로 굴려 간다
  const playingItem = useNowPlaying().item;
  const lastItem = useRef(playingItem);
  const currentRef = useRef(current);
  currentRef.current = current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: 재생 항목이 바뀔 때만 본다
  useEffect(() => {
    const prevItem = lastItem.current;
    lastItem.current = playingItem;
    const target = followStep(
      lesson,
      steps,
      currentRef.current,
      prevItem,
      playingItem,
    );
    if (target) go(target);
  }, [playingItem]);

  return (
    <>
      <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),1.25rem)] lg:grid lg:max-w-[100rem] lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_auto_1fr] lg:gap-x-8 lg:px-10 lg:pt-8 xl:grid-cols-[8.5rem_minmax(0,1fr)_26rem] xl:grid-rows-[auto_1fr] 2xl:grid-cols-[9rem_minmax(0,1fr)_30rem]">
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
                <p className="mt-1 text-ink-soft lg:text-lg">
                  {lesson.titleKo}
                </p>
              ) : null}
            </div>
            <OfflineButton
              pack={ilmutaPack(lesson)}
              className="mt-4 lg:max-w-xl 2xl:w-80 2xl:shrink-0"
            />
          </div>
        </header>

        {/* 폰: 재생기를 화면 위에 붙인다. 내려 읽으면 한 줄로 접힌다 */}
        <div className="contents lg:hidden">
          <LessonPlayerTop data={data} className="mt-4" />
        </div>

        {steps.length > 1 ? (
          <StepNav
            steps={steps}
            current={current}
            onGo={(s) => go(s)}
            className="lg:col-start-1 lg:row-start-2 xl:row-span-2 xl:row-start-1"
          />
        ) : null}

        <div className="lg:col-start-1 lg:row-start-3 xl:col-start-2 xl:row-start-2">
          {steps.map((s, i) => {
            const View = STEP_VIEW[s];
            return (
              <section
                key={s}
                id={`step-${s}`}
                data-step-section={s}
                aria-labelledby={`step-${s}-title`}
                // 위에 붙은 재생기(폰)·여백(PC) 아래에 구역 머리가 오게
                className="scroll-mt-24 pt-8 first:pt-5 lg:scroll-mt-6 lg:pt-12 lg:first:pt-6"
              >
                {steps.length > 1 ? (
                  <h2
                    id={`step-${s}-title`}
                    className="mb-4 text-sm font-medium text-ink-faint"
                  >
                    {i + 1}. {STEP_LABEL[s]}
                  </h2>
                ) : (
                  <h2 id={`step-${s}-title`} className="sr-only">
                    {STEP_LABEL[s]}
                  </h2>
                )}
                <View data={data} listens={listens} />
              </section>
            );
          })}

          <nav aria-label="다음 강" className="mt-12 mb-10">
            {data.nextNo !== null ? (
              <Link
                href={`/ilmuta/${data.nextNo}`}
                className="grid h-14 place-items-center rounded-2xl border border-line bg-bg-raised text-lg lg:hover:border-accent"
              >
                다음 강: {lessonLabel(data.nextNo)} →
              </Link>
            ) : (
              <Link
                href="/ilmuta"
                className="grid h-14 place-items-center rounded-2xl border border-line bg-bg-raised text-lg"
              >
                지도로
              </Link>
            )}
          </nav>
        </div>

        <aside
          aria-label={current === "writing" ? "쓰기 참고" : "강의와 자막"}
          className="hidden lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:block xl:col-start-3 xl:row-span-2"
        >
          <StickyPanel className="top-8 max-h-[calc(100dvh-4rem)]">
            <LessonAside data={data} section={current} />
          </StickyPanel>
        </aside>
      </main>
      {footer}
    </>
  );
}
