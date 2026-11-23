import { connection } from "next/server";
import type { Transcript } from "@/lib/context/cues";
import { getDb } from "@/lib/store/db";
import { summarizeListening } from "@/lib/store/listen";
import { loadTranscript } from "@/lib/textbook/load";
import type { Ilmunta, IlmuntaLesson } from "@/lib/textbook/schema";
import { loadIlmunta } from "./load";
import {
  type LessonListen,
  lectureItem,
  lessonListens,
  resumeLesson,
} from "./progress";

// 서버 컴포넌트가 쓰는 데이터 모으기. 교재·DB를 요청 때마다 읽는다(빌드 때 굳히지 않는다).

export interface MapData {
  book: Ilmunta;
  listens: LessonListen[];
  resume: number | null;
}

/** 과 목록·첫 화면 입구. 교재가 없으면 null */
export async function loadIlmuntaMap(): Promise<MapData | null> {
  await connection();
  const book = loadIlmunta();
  if (!book) return null;
  const listens = lessonListens(
    book.lessons,
    summarizeListening(getDb(), "ilmunta"),
  );
  return { book, listens, resume: resumeLesson(listens) };
}

export interface LessonData {
  lesson: IlmuntaLesson;
  prevNo: number | null;
  nextNo: number | null;
  /** 강의 열쇠 → 자막(없으면 null) */
  transcripts: Record<string, Transcript | null>;
  /** 끝까지 들은 강의·예문 열쇠 */
  heard: string[];
}

export type LessonLoad =
  | { kind: "missing" }
  | { kind: "notFound" }
  | { kind: "ok"; data: LessonData };

export async function loadIlmuntaLesson(no: number): Promise<LessonLoad> {
  await connection();
  const book = loadIlmunta();
  if (!book) return { kind: "missing" };
  const lesson = book.lessons.find((l) => l.no === no);
  if (!lesson) return { kind: "notFound" };
  const nos = book.lessons.map((l) => l.no).toSorted((a, b) => a - b);
  const at = nos.indexOf(no);
  const transcripts: Record<string, Transcript | null> = {};
  for (const l of lesson.lectures) {
    const item = lectureItem(l.file);
    transcripts[item] = loadTranscript("ilmunta", item);
  }
  const heard = summarizeListening(getDb(), "ilmunta")
    .filter((i) => i.completedPlays > 0)
    .map((i) => i.item);
  return {
    kind: "ok",
    data: {
      lesson,
      prevNo: at > 0 ? nos[at - 1] : null,
      nextNo: at < nos.length - 1 ? nos[at + 1] : null,
      transcripts,
      heard,
    },
  };
}
