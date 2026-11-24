import { buildLearnedIndex, learnedForSong } from "@/lib/songs/learned";
import type { IlmutaLesson } from "@/lib/textbook/schema";
import { lessonSentences, mergeTextbookAnalysis } from "./analysis";
import { loadTextbookAnalysis } from "./analysis-file";
import { emptyWordTap, type WordTapData } from "./types";

// 일무따 강 화면에 실을 낱말 누르기 자료. 서버 컴포넌트(ilmuta server-data)가 부른다.

export function loadIlmutaWordTap(
  lessons: readonly IlmutaLesson[],
  lesson: IlmutaLesson,
  dir?: string,
): WordTapData {
  const analysis = loadTextbookAnalysis("ilmuta", lesson.no, dir);
  if (!analysis) return emptyWordTap(lesson.no);
  const { analyses } = mergeTextbookAnalysis(lessonSentences(lesson), analysis);
  const learned = learnedForSong(
    Object.values(analyses),
    buildLearnedIndex(lessons),
  );
  return { book: "ilmuta", lessonNo: lesson.no, analyses, learned };
}
