"use client";

import { LectureContext } from "@/components/context/lecture-context";
import { examplesOf } from "@/lib/ilmuta/steps";
import { lectureItem, lessonQueue } from "@/lib/ilmuta/tracks";
import type { StepProps } from "./lesson-types";
import { OrientationGuide } from "./orientation-guide";
import { PlayCard } from "./play-card";
import { useNowPlaying, usePlay } from "./use-player-bridge";

/** 강의 듣기: 강의 다음에 그 강 예문이 이어지는 대기열. 지금 말의 자막과 이 강의 문형을 함께 */
export function StepLecture({ data, listens }: StepProps) {
  const { lesson, transcript } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const item = lectureItem(lesson.no);
  const active = now.item === item;
  const patterns = examplesOf(lesson, "patterns").flatMap(
    (e) => e.patterns ?? [],
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

        <LectureContext transcript={transcript} book="ilmuta" item={item} />
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
