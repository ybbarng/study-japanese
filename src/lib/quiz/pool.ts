import type { IlmutaLesson } from "@/lib/textbook/schema";
import { patternPieces } from "./text";

// 틀린 보기를 고를 곳. 지금 강 앞에서 배운 낱말·문형·회화 줄을 조금씩 모은다(서버가 만들어 강 화면에 싣는다).
// 아직 안 배운 말을 보기로 내면 정답을 소거법으로 맞히게 되므로, 지금 강까지 배운 것만 쓴다.

export interface PoolWord {
  ja: string;
  ko: string;
  reading?: string;
  lesson: number;
}

export interface PoolPiece {
  /** 문형 머리에서 뽑은 고정 조각(빈칸 보기) */
  piece: string;
  /** 그 조각이 나온 문형 머리와 뜻(틀린 보기를 골랐을 때 보인다) */
  head: string;
  headKo: string;
  lesson: number;
}

export interface PoolLine {
  ja: string;
  ko: string;
  lesson: number;
}

export interface QuizPool {
  words: PoolWord[];
  pieces: PoolPiece[];
  lines: PoolLine[];
}

export const emptyQuizPool = (): QuizPool => ({
  words: [],
  pieces: [],
  lines: [],
});

/** 앞 강 몇 개까지 볼지 */
const LOOKBACK = { words: 8, pieces: 12, lines: 4 } as const;

/** 지금 강까지(지금 강 포함) 가까운 강부터 보기 재료를 모은다 */
export function buildQuizPool(
  lessons: readonly IlmutaLesson[],
  no: number,
): QuizPool {
  const near = (n: number) =>
    lessons.filter((l) => l.no <= no && l.no > no - n);
  const words: PoolWord[] = [];
  const seenWords = new Set<string>();
  for (const l of near(LOOKBACK.words)) {
    const all = [
      ...l.examples
        .filter((e) => e.kind === "words")
        .flatMap((e) => e.sentences),
      ...(l.conversationWords ?? []),
    ];
    for (const s of all) {
      if (seenWords.has(s.ja) || s.ko === "" || s.ja.startsWith("～")) continue;
      seenWords.add(s.ja);
      words.push({ ja: s.ja, ko: s.ko, reading: s.reading, lesson: l.no });
    }
  }
  const pieces: PoolPiece[] = [];
  const seenPieces = new Set<string>();
  for (const l of near(LOOKBACK.pieces))
    for (const e of l.examples)
      for (const p of e.patterns ?? [])
        for (const piece of patternPieces(p.ja)) {
          if (seenPieces.has(piece)) continue;
          seenPieces.add(piece);
          pieces.push({ piece, head: p.ja, headKo: p.ko, lesson: l.no });
        }
  const lines: PoolLine[] = [];
  const seenLines = new Set<string>();
  for (const l of near(LOOKBACK.lines))
    for (const e of l.examples) {
      if (e.kind !== "conversationBasic" && e.kind !== "conversationAdvanced")
        continue;
      for (const s of e.sentences) {
        if (seenLines.has(s.ja)) continue;
        seenLines.add(s.ja);
        lines.push({ ja: s.ja, ko: s.ko, lesson: l.no });
      }
    }
  return { words, pieces, lines };
}
