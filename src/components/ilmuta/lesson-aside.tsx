"use client";

import { TranscriptList } from "@/components/context/transcript-list";
import type { ListenIndex } from "@/lib/ilmuta/progress";
import type { LessonData } from "@/lib/ilmuta/server-data";
import type { StepId } from "@/lib/ilmuta/steps";
import { lectureItem, lessonQueue } from "@/lib/ilmuta/tracks";
import { PlayCard } from "./play-card";
import { useNowPlaying, usePlay } from "./use-player-bridge";
import { WritingReference } from "./writing-reference";

/**
 * PC 강 화면의 오른쪽 고정 곁칸. 쓰기 단계에서는 쓰기 참고를, 그 밖에는 강의 재생과 자막 전체를.
 * 단어·문형을 보는 동안에도 강의가 옆에서 이어져, 책과 강의 CD를 번갈아 펴지 않아도 된다.
 */
export function LessonAside({
  data,
  listens,
  step,
}: {
  data: LessonData;
  listens: ListenIndex;
  step: StepId;
}) {
  if (step === "writing")
    return <WritingReference data={data} layout="panel" />;
  return <LecturePanel data={data} listens={listens} />;
}

function LecturePanel({
  data,
  listens,
}: {
  data: LessonData;
  listens: ListenIndex;
}) {
  const { lesson, transcript } = data;
  const play = usePlay();
  const now = useNowPlaying();
  const item = lectureItem(lesson.no);
  const active = now.item === item;
  const start = () => play(lessonQueue(lesson), 0);

  return (
    <>
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
        onPress={start}
      />
      {transcript ? (
        <TranscriptList
          transcript={transcript}
          book="ilmuta"
          item={item}
          // 이 강의가 소리 나고 있지 않으면 틀고(이미 올라 있으면 이어서), 소리가 나면 자막이 그 줄로 옮긴다
          onStart={() => play(lessonQueue(lesson), 0, false)}
          className="min-h-0 flex-1"
        />
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-faint">
          이 강의 자막은 아직 없습니다. 자막이 생기면 여기에 강의 전체 말이
          흐르고, 줄을 눌러 그 말부터 다시 들을 수 있습니다.
        </p>
      )}
    </>
  );
}
