"use client";

import { examplesOf } from "@/lib/ilmuta/steps";
import { lectureItem, lessonQueue } from "@/lib/ilmuta/tracks";
import type { StepProps } from "./lesson-types";
import { OrientationGuide } from "./orientation-guide";
import { PlayCard } from "./play-card";
import { useNowPlaying, usePlay } from "./use-player-bridge";

/**
 * 강의 구역: 이 강 강의를 고르는 단추(강의 다음에 그 강 예문이 이어진다)와 이 강의 문형.
 * 재생 위치·지금 하는 말은 화면 위(폰)·오른쪽 칸(PC)에 붙은 재생기에 있다.
 */
export function StepLecture({ data, listens }: StepProps) {
  const { lesson } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const item = lectureItem(lesson.no);
  const patterns = examplesOf(lesson, "patterns").flatMap(
    (e) => e.patterns ?? [],
  );

  return (
    <div className="space-y-5">
      <PlayCard
        title="이 강 강의"
        note={
          lesson.examples.length > 0
            ? `끝나면 이 강 예문 ${lesson.examples.length}개가 이어집니다`
            : undefined
        }
        durationSec={lesson.lecture.durationSec}
        count={listens[item]}
        playing={now.item === item && now.playing}
        onPress={() => play(lessonQueue(lesson), 0)}
      />

      {lesson.no === 0 ? <OrientationGuide /> : null}

      {patterns.length > 0 ? (
        <section>
          <h3 className="text-sm text-ink-faint">이 강에서 익힐 문형</h3>
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
