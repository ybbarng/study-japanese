"use client";

import { LectureContext } from "@/components/context/lecture-context";
import { TranscriptList } from "@/components/context/transcript-list";
import { InlinePlayer } from "@/components/player/inline-player";
import type { LessonData } from "@/lib/ilmuta/server-data";
import type { StepId } from "@/lib/ilmuta/steps";
import { lectureItem, lessonQueue } from "@/lib/ilmuta/tracks";
import { useLectureStage } from "./lecture-stage";
import { type LessonNow, useLessonNow } from "./use-lesson-now";
import { usePlay } from "./use-player-bridge";
import { WritingReference } from "./writing-reference";

/** 이 강을 아직 틀지 않았을 때 재생기 큰 단추: 강의부터 예문까지 차례로 */
function useLessonIdle(data: LessonData) {
  const play = usePlay();
  return {
    label: "강의 듣기",
    onStart: () => play(lessonQueue(data.lesson), 0),
  };
}

/** 지금 무엇을 듣는지(강의가 끝나 예문이 이어지면 그 예문) */
function NowHeading({ shown }: { shown: LessonNow }) {
  if (!shown.exampleLabel) return null;
  return (
    <p className="mb-2 flex items-center gap-2 text-sm">
      <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-white">
        지금
      </span>
      <span className="truncate text-ink-soft">
        강의 다음 예문 · {shown.exampleLabel}
      </span>
    </p>
  );
}

function idleText(shown: LessonNow): string | undefined {
  return shown.exampleLabel
    ? `지금 나오는 것: ${shown.exampleLabel}. 이 예문은 자막이 아직 없습니다.`
    : undefined;
}

/**
 * 폰 강 화면 위에 붙는 재생기. 펼쳐 있으면 지금 하는 말(붙든 일본어 줄과 지금 말 한 줄)을 함께,
 * 내려 읽으면 한 줄로 접혀 교재를 가리지 않는다.
 */
export function LessonPlayerTop({
  data,
  className,
}: {
  data: LessonData;
  className?: string;
}) {
  const idle = useLessonIdle(data);
  const shown = useLessonNow(data);
  return (
    <InlinePlayer
      variant="top"
      idle={idle}
      className={className}
      collapsedChildren={
        <LectureContext
          key={`lines-${shown.item}`}
          transcript={shown.transcript}
          book="ilmuta"
          item={shown.item}
          lines
          className="mt-1.5"
        />
      }
    >
      <LectureContext
        key={shown.item}
        transcript={shown.transcript}
        book="ilmuta"
        item={shown.item}
        compact
        heading={<NowHeading shown={shown} />}
        className="mt-2"
      />
    </InlinePlayer>
  );
}

/**
 * PC 강 화면의 오른쪽 고정 칸. 맨 위에 재생기, 그 아래 지금 하는 말(크게)과 자막 전체 목록.
 * 쓰기 구역을 읽는 동안에는 자막 대신 쓰기 참고를 둔다. 교재를 읽어 내려가는 동안에도 강의가 옆에서 이어진다.
 */
export function LessonAside({
  data,
  section,
}: {
  data: LessonData;
  section: StepId;
}) {
  const idle = useLessonIdle(data);
  return (
    <>
      <InlinePlayer variant="panel" idle={idle} />
      {/* 낱말 정보 창(PC)이 이 자리를 잠시 덮는다: 재생기 조작과 가운데 교재는 가리지 않는다 */}
      <div
        data-word-panel-slot
        className="relative flex min-h-0 flex-1 flex-col gap-4"
      >
        {section === "writing" ? (
          <WritingReference data={data} layout="panel" />
        ) : (
          <LecturePanel data={data} />
        )}
      </div>
    </>
  );
}

function LecturePanel({ data }: { data: LessonData }) {
  const { lesson } = data;
  const play = usePlay();
  const item = lectureItem(lesson.no);
  // 강의가 끝나 예문이 이어지면 지금 하는 말과 자막 목록도 그 예문의 자막으로
  const shown = useLessonNow(data);
  const transcript = shown.transcript;
  // 가운데 칸에 강의 무대가 보이면 같은 카드를 겹쳐 두지 않고 자막 목록을 길게 쓴다
  const staged = useLectureStage((s) => s.visible) && shown.item === item;

  if (!transcript)
    return (
      <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-faint">
        이 강의 자막은 아직 없습니다. 자막이 생기면 여기에 강의 전체 말이
        흐르고, 줄을 눌러 그 말부터 다시 들을 수 있습니다.
      </p>
    );
  return (
    <>
      {staged ? null : (
        <LectureContext
          key={`ctx-${shown.item}`}
          transcript={transcript}
          book="ilmuta"
          item={shown.item}
          heading={<NowHeading shown={shown} />}
          idle={idleText(shown)}
          className="shrink-0"
        />
      )}
      <TranscriptList
        key={shown.item}
        transcript={transcript}
        book="ilmuta"
        item={shown.item}
        // 위 칸이 지금 하는 말을 펼쳐 보이니 목록은 지금 줄만 강조한다(접혔다 펴지지 않게)
        expand={false}
        title={
          shown.item === item
            ? undefined
            : `지금 예문 자막 · ${shown.exampleLabel ?? ""}`
        }
        // 이 강의가 소리 나고 있지 않으면 틀고(이미 올라 있으면 이어서), 소리가 나면 자막이 그 줄로 옮긴다
        onStart={() => play(lessonQueue(lesson), 0, false)}
        className="min-h-40 flex-1"
      />
    </>
  );
}
