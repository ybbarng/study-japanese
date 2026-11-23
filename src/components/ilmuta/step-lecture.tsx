"use client";

import { examplesOf } from "@/lib/ilmuta/steps";
import { lectureItem, lessonQueue } from "@/lib/ilmuta/tracks";
import { LectureContext } from "./lecture-context";
import type { StepProps } from "./lesson-types";
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

      <LectureContext transcript={transcript} active={active} />

      {patterns.length > 0 ? (
        <section>
          <h2 className="text-sm text-ink-faint">이 강에서 익힐 문형</h2>
          <ol className="mt-2 space-y-3">
            {patterns.map((p) => (
              <li key={p.no} className="rounded-2xl bg-bg-raised px-4 py-3">
                <p lang="ja" className="font-ja-serif text-xl">
                  {p.ja}
                </p>
                <p className="text-sm text-ink-soft">{p.ko}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
