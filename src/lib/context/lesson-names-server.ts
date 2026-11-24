import type { Ilmuta } from "@/lib/textbook/schema";
import {
  lessonSentences,
  mergeTextbookAnalysis,
} from "@/lib/word-tap/analysis";
import { loadTextbookAnalysis } from "@/lib/word-tap/analysis-file";
import type { LessonExtras } from "./card-sources";
import { analysisGlossary, lessonNames } from "./lesson-names";

// 일무따 강 하나의 이름·분석 읽기를 낱말 분석 파일에서 모은다. 서버(자막 API)와 숫자 보고가 부른다.

export function ilmutaLessonExtras(
  ilmuta: Ilmuta | null,
  no: number | null,
  dir?: string,
): LessonExtras | null {
  const lesson = ilmuta?.lessons.find((l) => l.no === no);
  if (!lesson || no === null) return null;
  const analysis = loadTextbookAnalysis("ilmuta", no, dir);
  const { analyses } = mergeTextbookAnalysis(lessonSentences(lesson), analysis);
  const tokensOf = (ja: string) => analyses[ja]?.tokens ?? null;
  return {
    names: lessonNames(lesson, tokensOf),
    glossary: analysisGlossary(lesson, tokensOf),
  };
}
