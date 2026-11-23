import type { IlmutaLesson } from "@/lib/textbook/schema";
import type { SongLine } from "./schema";
import { groupTokens } from "./words";

// 노래 속 낱말 중 일무따에서 이미 배운 것: "일무따 n강에서 배움"을 붙인다.
// 일무따 각 강의 단어 코너·회화 단어를 사전으로 삼아, 낱말 → 처음 나온 강.

/** 낱말 → 처음 배운 강 */
export type LearnedIndex = Record<string, number>;

const EDGE_MARKS = /^[\s　。、！？!?「」…・]+|[\s　。、！？!?「」…・]+$/g;

function clean(word: string): string {
  return word.replace(EDGE_MARKS, "");
}

export function buildLearnedIndex(
  lessons: readonly IlmutaLesson[],
): LearnedIndex {
  const out: LearnedIndex = {};
  for (const lesson of lessons) {
    const words = [
      ...lesson.examples
        .filter((e) => e.kind === "words")
        .flatMap((e) => e.sentences),
      ...(lesson.conversationWords ?? []),
    ];
    for (const w of words) {
      const key = clean(w.ja);
      if (key === "") continue;
      if (out[key] === undefined || lesson.no < out[key]) out[key] = lesson.no;
    }
  }
  return out;
}

/**
 * 노래에 나오는 낱말만 골라 둔다(화면에 일무따 사전 전체를 보내지 않게).
 * 기본형(降る)과 겉모양(降っていた) 둘 다 본다.
 */
export function learnedForSong(
  lines: readonly SongLine[],
  index: LearnedIndex,
): LearnedIndex {
  const out: LearnedIndex = {};
  for (const line of lines) {
    for (const word of groupTokens(line.tokens ?? [])) {
      for (const key of [word.base, word.surface]) {
        const no = index[key];
        if (no !== undefined) out[key] = no;
      }
    }
  }
  return out;
}

/** 이 낱말을 배운 강(기본형을 먼저 본다). 모르면 null */
export function learnedLessonOf(
  word: { base: string; surface: string },
  index: LearnedIndex,
): number | null {
  return index[word.base] ?? index[word.surface] ?? null;
}
