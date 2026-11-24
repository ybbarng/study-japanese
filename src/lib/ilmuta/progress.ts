import type { ItemSummary } from "@/lib/store/listen";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { lectureItem } from "./tracks";

// 들은 기록·쓴 문장으로 강마다 어디까지 했는지 센다.

/** 항목(item)별 들은 횟수 */
export interface ListenCount {
  plays: number;
  completedPlays: number;
}
export type ListenIndex = Record<string, ListenCount>;

export function indexListens(items: ItemSummary[]): ListenIndex {
  const out: ListenIndex = {};
  for (const i of items) {
    const prev = out[i.item] ?? { plays: 0, completedPlays: 0 };
    out[i.item] = {
      plays: prev.plays + i.plays,
      completedPlays: prev.completedPlays + i.completedPlays,
    };
  }
  return out;
}

export interface LessonProgress {
  no: number;
  /** 강의를 끝까지(90% 넘게) 들은 적이 있다 */
  lectureDone: boolean;
  lecturePlays: number;
  /** 끝까지 들은 예문 수 */
  examplesHeard: number;
  examplesTotal: number;
  /** 강의·예문 차례대로 끝까지 들었는지(지도에 작은 점으로) */
  pips: boolean[];
  /** 쓴 문장 수 */
  written: number;
  /** 문장 3개를 다 썼다(0강은 쓰지 않으므로 늘 참) */
  writingDone: boolean;
}

/**
 * 강의를 들은 강 수와 전체 강 수. 0강은 책 앞의 안내 강의라 세지 않는다(책 차례의 1~60강).
 * 왼쪽 탐색과 일무따 머리가 같은 수를 보이게 한 곳에서 센다.
 */
export function lectureTally(rows: { no: number; lectureDone: boolean }[]): {
  done: number;
  total: number;
} {
  const counted = rows.filter((r) => r.no > 0);
  return {
    done: counted.filter((r) => r.lectureDone).length,
    total: counted.length,
  };
}

export function lessonProgress(
  lesson: IlmutaLesson,
  listens: ListenIndex,
  written: number,
  sentencesPerLesson = 3,
): LessonProgress {
  const heard = (item: string) => (listens[item]?.completedPlays ?? 0) > 0;
  const lecture = lectureItem(lesson.no);
  const exampleHeard = lesson.examples.map((e) => heard(e.id));
  return {
    no: lesson.no,
    lectureDone: heard(lecture),
    lecturePlays: listens[lecture]?.plays ?? 0,
    examplesHeard: exampleHeard.filter(Boolean).length,
    examplesTotal: lesson.examples.length,
    pips: [heard(lecture), ...exampleHeard],
    written,
    writingDone: lesson.no === 0 || written >= sentencesPerLesson,
  };
}
