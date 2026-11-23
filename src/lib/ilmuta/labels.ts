import type { Example, IlmutaLesson } from "@/lib/textbook/schema";

/** 책의 코너 이름 */
export const KIND_LABEL: Record<Example["kind"], string> = {
  dialogue: "기본 회화 듣기",
  words: "기본 단어 익히기",
  patterns: "기본 문형 익히기",
  conversationBasic: "회화로 다지기 Basic",
  conversationAdvanced: "회화로 다지기 Advanced",
  exercise: "연습 문제",
  longReading: "장문 도전하기",
  grammarExamples: "문법 예문",
  reading: "읽기",
  unknown: "예문",
};

export const BOOK_NAME = "일본어 무작정 따라하기";

export function lessonLabel(no: number): string {
  return no === 0 ? "오리엔테이션" : `${no}강`;
}

export function registerLabel(
  register: IlmutaLesson["register"],
): string | null {
  if (register === "casual") return "반말";
  if (register === "polite") return "존댓말";
  return null;
}
