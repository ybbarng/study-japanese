import type { GrammarNote, ShownToken } from "@/lib/songs/analysis";
import type { LearnedIndex } from "@/lib/songs/learned";

// 서버가 강 화면에 실어 보내는 낱말 누르기 자료(클라이언트도 가져가는 타입만).

export interface WordTapSentence {
  tokens: ShownToken[];
  grammar: GrammarNote[];
}

export interface WordTapData {
  book: "ilmuta";
  lessonNo: number;
  /** 문장 글 → 낱말 분석. 화면은 보이는 문장 글로 찾는다(분석이 없는 문장은 글만 보인다) */
  analyses: Record<string, WordTapSentence>;
  /** 분석에 나오는 낱말 중 일무따에서 배운 것 → 강 */
  learned: LearnedIndex;
}

export function emptyWordTap(lessonNo: number): WordTapData {
  return { book: "ilmuta", lessonNo, analyses: {}, learned: {} };
}
