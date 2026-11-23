import type { IlmuntaLesson } from "@/lib/textbook/schema";

export const BOOK_NAME = "일문따";
export const BOOK_FULL_NAME = "일본어 문법 무작정 따라하기";

/** "23~29쪽" (쪽수를 모르면 빈 글) */
export function pagesLabel(lesson: Pick<IlmuntaLesson, "pages">): string {
  return lesson.pages ? `${lesson.pages.from}~${lesson.pages.to}쪽` : "";
}
