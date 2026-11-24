import { dictionaryIndex } from "@/lib/dictionary/index-server";
import type { Ilmuta } from "@/lib/textbook/schema";
import {
  lessonSentences,
  mergeTextbookAnalysis,
} from "@/lib/word-tap/analysis";
import { loadTextbookAnalysis } from "@/lib/word-tap/analysis-file";
import { type LessonExtras, lessonNoOfItem } from "./card-sources";
import { type DictChips, dictChips } from "./dict-words";
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
  if (book === "ilmuta") {
    const extras = ilmutaLessonExtras(ilmuta, no, dir);
    // 받아 적은 글의 칩: 사전 색인 가운데 그 강까지 나온 낱말
    return extras && no !== null
      ? { ...extras, dict: lessonDictChips(ilmuta, no) }
      : extras;
  }
  if (book === "ilmunta" && no !== null)
    return {
      echoes: ilmuntaLessonLines(no, item, dir),
      // 일문따는 일무따(1분기)를 마친 뒤라 일무따 낱말을 모두 안다고 본다
      dict: lessonDictChips(ilmuta),
    };
  return null;
}

/** 사전 색인에서 고른 칩(upto 강까지). 일무따 교재를 볼 수 없으면 드릴 낱말만 */
function lessonDictChips(ilmuta: Ilmuta | null, upto?: number): DictChips {
  const index = dictionaryIndex(ilmuta);
  return dictChips(index.entries, index.inflections, upto);
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
