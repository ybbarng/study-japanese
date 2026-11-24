"use client";

import { LectureContext } from "@/components/context/lecture-context";
import { examplesOf } from "@/lib/ilmuta/steps";
import { lectureItem, lessonQueue } from "@/lib/ilmuta/tracks";
import type { StepProps } from "./lesson-types";
import { OrientationGuide } from "./orientation-guide";
import { PlayCard } from "./play-card";
import { useLessonNow } from "./use-lesson-now";
import { useNowPlaying, usePlay } from "./use-player-bridge";

/**
 * 강의 듣기: 강의 다음에 그 강 예문이 이어지는 대기열. 지금 하는 말의 자막과 이 강의 문형을 함께.
 * 강의가 끝나 예문으로 넘어가면 자막 칸도 그 예문을 따라간다.
 * PC에서는 가운데 칸 위쪽에 지금 하는 말을 크게 고정하고(강의 재생·자막 전체는 오른쪽 곁칸),
 * 그 아래에 이 강의 문형을 둔다.
 */
export function StepLecture({ data, listens }: StepProps) {
  const { lesson } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const item = lectureItem(lesson.no);
  const active = now.item === item;
  const shown = useLessonNow(data);
  const patterns = examplesOf(lesson, "patterns").flatMap(
    (e) => e.patterns ?? [],
  );

  const heading = shown.exampleLabel ? (
    <p className="mb-3 flex items-center gap-2 text-sm">
      <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-white">
        지금
      </span>
      <span className="text-ink-soft">
        강의 다음 예문 · {shown.exampleLabel}
      </span>
    </p>
  ) : null;
  const idle = shown.exampleLabel
    ? `지금 나오는 것: ${shown.exampleLabel}. 이 예문은 자막이 아직 없습니다.`
    : undefined;
  const context = (size: "card" | "stage") => (
    <LectureContext
      transcript={shown.transcript}
      book="ilmuta"
      item={shown.item}
      size={size}
      heading={heading}
      idle={idle}
    />
  );

  return (
    <div className="space-y-5">
      {/* PC에서는 강의 재생과 자막 전체가 오른쪽 곁칸(LessonAside)에 있다 */}
      <div className="space-y-5 lg:hidden">
        <PlayCard
          big
          title={active && now.playing ? "강의 듣는 중" : "강의 듣기"}
          note={
            lesson.examples.length > 0
              ? `끝나면 이 강 예문 ${lesson.examples.length}개가 이어집니다`
              : undefined
          }
          durationSec={lesson.lecture.durationSec}
          count={listens[item]}
          playing={active && now.playing}
          onPress={() => play(lessonQueue(lesson), 0)}
        />
        {context("card")}
      </div>

      {/* PC: 가운데 넓은 칸에 지금 하는 말을 크게. 문형을 내려 보는 동안에도 위에 붙어 있다 */}
      <div className="sticky top-4 z-10 hidden rounded-2xl bg-bg shadow-[0_12px_24px_-12px_var(--bg)] lg:block">
        {context("stage")}
      </div>

      {lesson.no === 0 ? <OrientationGuide /> : null}

      {patterns.length > 0 ? (
        <section>
          <h2 className="text-sm text-ink-faint">이 강에서 익힐 문형</h2>
          {/* 좁은 PC(lg)에서는 가운데 칸이 좁아 두 칸이면 문형이 꺾인다. 넓은 PC(xl)부터 두 칸 */}
          <ol className="mt-2 space-y-3 xl:grid xl:grid-cols-2 xl:gap-3 xl:space-y-0">
            {patterns.map((p) => (
              <li
                key={p.no}
                className="rounded-2xl bg-bg-raised px-4 py-3 lg:px-5 lg:py-4"
              >
                <p lang="ja" className="font-ja-serif text-xl lg:text-2xl">
                  {p.ja}
                </p>
                <p className="text-sm text-ink-soft lg:text-base">{p.ko}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
