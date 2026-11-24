import type { Ilmuta } from "@/lib/textbook/schema";
import {
  lessonSentences,
  mergeTextbookAnalysis,
} from "@/lib/word-tap/analysis";
import { loadTextbookAnalysis } from "@/lib/word-tap/analysis-file";
import { type LessonExtras, lessonNoOfItem } from "./card-sources";
import { ilmuntaLessonLines } from "./ilmunta-pairs";
import { analysisGlossary, lessonNames } from "./lesson-names";

// 자막 하나에 카드를 붙일 때 덧붙일 재료를 파일에서 모은다. 서버(자막 API)와 숫자 보고가 부른다.
// 일무따: 그 강 낱말 분석의 이름·한자 읽기. 일문따: 같은 과 예문 mp3 자막의 일본어 줄.

export function contextExtras(
  book: string,
  item: string,
  ilmuta: Ilmuta | null,
  dir?: string,
): LessonExtras | null {
  const no = lessonNoOfItem(item);
  if (book === "ilmuta") return ilmutaLessonExtras(ilmuta, no, dir);
  if (book === "ilmunta" && no !== null)
    return { echoes: ilmuntaLessonLines(no, item, dir) };
  return null;
}

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
