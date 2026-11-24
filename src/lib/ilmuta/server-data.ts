import { connection } from "next/server";
import { loadContextTranscript, visibleBooks } from "@/lib/context/server";
import { buildQuizPool, emptyQuizPool, type QuizPool } from "@/lib/quiz/pool";
import { getDb } from "@/lib/store/db";
import { summarizeListening } from "@/lib/store/listen";
import {
  countWritten,
  getWriting,
  listWritings,
  SENTENCES_PER_LESSON,
  type WritingDoc,
} from "@/lib/store/writings";
import { loadIlmuta } from "@/lib/textbook/load";
import type { Ilmuta, IlmutaLesson } from "@/lib/textbook/schema";
import { loadIlmutaWordTap } from "@/lib/word-tap/server";
import { emptyWordTap, type WordTapData } from "@/lib/word-tap/types";
import type { Transcript } from "./context-cues";
import { type ContinuePick, pendingWriting, pickContinue } from "./continue";
import {
  indexListens,
  type LessonProgress,
  type ListenIndex,
  lessonProgress,
} from "./progress";
import { redactIlmutaLesson } from "./redact";
import { buildGlossary, type Glossary } from "./ruby";
import { lectureItem } from "./tracks";

// 화면(서버 컴포넌트)이 쓰는 데이터 모으기. 교재·DB를 요청 때마다 읽는다(빌드 때 굳히지 않는다).

export interface LessonRow {
  no: number;
  title: string;
  titleKo?: string;
  register?: IlmutaLesson["register"];
  progress: LessonProgress;
}

export interface MapData {
  rows: LessonRow[];
  pick: ContinuePick;
  pendingWriting: number[];
}

function buildRows(book: Ilmuta, listens: ListenIndex, writings: WritingDoc[]) {
  const written = new Map(writings.map((w) => [w.lesson, countWritten(w)]));
  return book.lessons
    .toSorted((a, b) => a.no - b.no)
    .map((l) => ({
      no: l.no,
      title: l.title,
      titleKo: l.titleKo,
      register: l.register,
      progress: lessonProgress(
        l,
        listens,
        written.get(l.no) ?? 0,
        SENTENCES_PER_LESSON,
      ),
    }));
}

/** 지도·첫 화면 입구. 교재가 없으면 null */
export async function loadMapData(): Promise<MapData | null> {
  await connection();
  const book = loadIlmuta();
  if (!book) return null;
  const db = getDb();
  const rows = buildRows(
    book,
    indexListens(summarizeListening(db, "ilmuta")),
    listWritings(db, "ilmuta"),
  );
  const progress = rows.map((r) => r.progress);
  return {
    rows,
    pick: pickContinue(progress, Date.now()),
    pendingWriting: pendingWriting(progress),
  };
}

export interface LessonData {
  lesson: IlmutaLesson;
  /** 이 교재 출처를 닫아 두어 방문자에게 글·자막·오디오를 보이지 않는 중 */
  sourceClosed: boolean;
  prevNo: number | null;
  nextNo: number | null;
  glossary: Glossary;
  transcript: Transcript | null;
  listens: ListenIndex;
  writing: WritingDoc | null;
  /** 예문 낱말 누르기 자료(content/textbook-analysis, docs/textbook-analysis.md) */
  wordTap: WordTapData;
  /** 구역 끝 확인 문제의 틀린 보기 재료(지금 강까지 배운 낱말·문형·회화 줄) */
  quizPool: QuizPool;
}

export type LessonLoad =
  | { kind: "missing" }
  | { kind: "notFound" }
  | { kind: "ok"; data: LessonData };

export async function loadLessonData(no: number): Promise<LessonLoad> {
  await connection();
  const book = loadIlmuta();
  if (!book) return { kind: "missing" };
  const lesson = book.lessons.find((l) => l.no === no);
  if (!lesson) return { kind: "notFound" };
  const nos = book.lessons.map((l) => l.no).toSorted((a, b) => a - b);
  const at = nos.indexOf(no);
  const db = getDb();
  // 출처를 닫았으면(설정) 방문자에게는 소책자 글·자막을 빼고 보인다
  const canSee = await visibleBooks();
  const visible = canSee("ilmuta");
  return {
    kind: "ok",
    data: {
      lesson: visible ? lesson : redactIlmutaLesson(lesson),
      sourceClosed: !visible,
      prevNo: at > 0 ? nos[at - 1] : null,
      nextNo: at < nos.length - 1 ? nos[at + 1] : null,
      glossary: visible
        ? buildGlossary(book.lessons, no)
        : buildGlossary([], no),
      transcript: loadContextTranscript("ilmuta", lectureItem(no), canSee),
      listens: indexListens(summarizeListening(db, "ilmuta")),
      writing: getWriting(db, "ilmuta", no),
      // 분석은 교재 문장을 잘라 만든 조각이라 교재를 볼 수 있을 때만 싣는다
      wordTap: visible
        ? loadIlmutaWordTap(book.lessons, lesson)
        : emptyWordTap(no),
      quizPool: visible ? buildQuizPool(book.lessons, no) : emptyQuizPool(),
    },
  };
}
