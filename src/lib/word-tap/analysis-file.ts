import path from "node:path";
import type { AnalysisBook } from "@/lib/songs/analysis";
import { contentDir, readJson } from "@/lib/textbook/load";
import { type TextbookAnalysis, textbookAnalysisSchema } from "./analysis";

// 교재 예문 분석 파일(CONTENT_DIR/textbook-analysis/<book>/<lesson>.json)을 읽는다. 서버만 부른다.

export function textbookAnalysisPath(
  book: AnalysisBook,
  lesson: number,
  dir = contentDir(),
): string {
  return path.join(dir, "textbook-analysis", book, `${lesson}.json`);
}

/** 없거나 모양이 틀리면 null(화면은 분석 없이 글만 보인다. 틀린 것은 check가 알린다) */
export function loadTextbookAnalysis(
  book: AnalysisBook,
  lesson: number,
  dir: string = contentDir(),
): TextbookAnalysis | null {
  try {
    const analysis = readJson(
      textbookAnalysisPath(book, lesson, dir),
      textbookAnalysisSchema,
    );
    if (!analysis || analysis.book !== book || analysis.lesson !== lesson)
      return null;
    return analysis;
  } catch {
    return null;
  }
}
