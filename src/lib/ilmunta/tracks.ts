import type { Track } from "@/lib/player/queue";
import type { IlmuntaLesson } from "@/lib/textbook/schema";
import { ilmuntaMediaUrl } from "./media";
import { lectureItem } from "./progress";

const EXAMPLE_LABEL: Record<string, string> = {
  grammarExamples: "문법 예문",
  reading: "읽기 예문",
};

export function exampleLabel(kind: string): string {
  return EXAMPLE_LABEL[kind] ?? "예문";
}

/** 과 하나를 재생기 대기열로: 강의들 → 예문들 */
export function lessonTracks(lesson: IlmuntaLesson): Track[] {
  const subtitle = lesson.title
    ? `일문따 ${lesson.no}과 · ${lesson.title}`
    : `일문따 ${lesson.no}과`;
  const n = lesson.lectures.length;
  return [
    ...lesson.lectures.map(
      (l, i): Track => ({
        book: "ilmunta",
        item: lectureItem(l.file),
        kind: "lecture",
        src: ilmuntaMediaUrl(l.file),
        title: `${lesson.no}과 강의 ${i + 1}/${n}`,
        subtitle,
      }),
    ),
    ...lesson.examples.map(
      (e): Track => ({
        book: "ilmunta",
        item: e.id,
        kind: "example",
        src: ilmuntaMediaUrl(e.file),
        title: `${lesson.no}과 ${exampleLabel(e.kind)}`,
        subtitle,
      }),
    ),
  ];
}
