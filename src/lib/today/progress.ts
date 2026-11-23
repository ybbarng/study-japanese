import type { CardId } from "@/lib/kana/data";
import { LESSONS, lessonCards } from "@/lib/kana/lessons";

// 첫 화면의 "지금 어디까지": 가나 익힌 글자, 일무따 강, 일문따 과.

const ALL_LESSON_CARDS: ReadonlySet<CardId> = new Set(
  LESSONS.flatMap(lessonCards),
);

/** 배우기 시작한 가나 글자 수 / 레슨에 나오는 전체 글자 수 */
export function kanaProgress(cards: Partial<Record<CardId, unknown>>): {
  learned: number;
  total: number;
} {
  let learned = 0;
  for (const id of ALL_LESSON_CARDS) if (cards[id]) learned++;
  return { learned, total: ALL_LESSON_CARDS.size };
}

/** from~to(양 끝 포함) 가운데 끝낸 수 */
export function countInRange(
  done: ReadonlySet<number>,
  from: number,
  to: number,
): number {
  let n = 0;
  for (const no of done) if (no >= from && no <= to) n++;
  return n;
}
