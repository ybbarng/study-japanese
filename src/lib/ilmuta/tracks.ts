import type { Track } from "@/lib/player/queue";
import type { Example, IlmutaLesson, Sentence } from "@/lib/textbook/schema";
import { KIND_LABEL, lessonLabel } from "./labels";
import { ilmutaMediaUrl } from "./media";

// 교재 항목을 사이트 재생기의 Track으로 바꾼다. item은 들은 기록의 열쇠다(강의 `L01`, 예문 `01-3`).

export function lectureItem(no: number): string {
  return `L${String(no).padStart(2, "0")}`;
}

function subtitle(lesson: IlmutaLesson): string {
  return lesson.title ? `일무따 · ${lesson.title}` : "일무따";
}

/** 재생 화면에 크게 띄울 줄. 단어는 읽는 법을 괄호로 붙인다. */
export function sentenceLine(s: Sentence): { ja: string; ko?: string } {
  const ja = s.reading && s.reading !== s.ja ? `${s.ja}（${s.reading}）` : s.ja;
  return s.ko ? { ja, ko: s.ko } : { ja };
}

export function lectureTrack(lesson: IlmutaLesson): Track {
  return {
    book: "ilmuta",
    item: lectureItem(lesson.no),
    kind: "lecture",
    src: ilmutaMediaUrl(lesson.lecture.file),
    title: `${lessonLabel(lesson.no)} 강의`,
    subtitle: subtitle(lesson),
  };
}

export function exampleTrack(lesson: IlmutaLesson, example: Example): Track {
  const track: Track = {
    book: "ilmuta",
    item: example.id,
    kind: "example",
    src: ilmutaMediaUrl(example.file),
    title: `${lessonLabel(lesson.no)} ${KIND_LABEL[example.kind]}`,
    subtitle: subtitle(lesson),
  };
  if (example.sentences.length > 0)
    track.lines = example.sentences.map(sentenceLine);
  return track;
}

/** 강의 다음에 그 강 예문을 책 차례대로 */
export function lessonQueue(lesson: IlmutaLesson): Track[] {
  return [
    lectureTrack(lesson),
    ...lesson.examples.map((e) => exampleTrack(lesson, e)),
  ];
}
