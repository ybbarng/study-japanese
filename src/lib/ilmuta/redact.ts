import type { IlmutaLesson } from "@/lib/textbook/schema";

/**
 * 출처를 닫았을 때(설정) 방문자에게 보일 강: 소책자에서 온 글(예문 문장·문형·회화 낱말)을 뺀다.
 * 강 번호·제목·쪽수·오디오 목록은 남긴다(오디오는 /media가 따로 막는다).
 */
export function redactIlmutaLesson(lesson: IlmutaLesson): IlmutaLesson {
  return {
    ...lesson,
    examples: lesson.examples.map((e) => ({
      ...e,
      sentences: [],
      patterns: undefined,
    })),
    conversationWords: undefined,
  };
}
