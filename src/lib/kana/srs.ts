/**
 * 가나 카드 간격 반복(Leitner 상자 방식). 시간은 언제나 인자(ms)로 받는다.
 *
 * - 상자 0: 방금 틀렸거나 막 배운 글자. 10분 뒤 다시.
 * - 맞히면 한 칸 올라가고, 상자마다 정한 날만큼 뒤에 다시 본다.
 * - 틀리면 상자 0으로 내려간다.
 * - 아직 때가 안 된 카드를 맞혀도 올라가지 않는다(한자리에서 몰아 맞혀 부풀리지 않게).
 */

export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;

/** 상자 번호별 다음 복습까지 시간 */
export const INTERVALS: number[] = [
  10 * MINUTE,
  1 * DAY,
  2 * DAY,
  4 * DAY,
  8 * DAY,
  16 * DAY,
  32 * DAY,
];
export const MAX_BOX = INTERVALS.length - 1;

export interface CardState {
  box: number;
  /** 다음 복습 시각(ms) */
  due: number;
  /** 지금까지 틀린 횟수 */
  lapses: number;
  /** 지금까지 본 횟수 */
  reps: number;
  /** 마지막으로 본 시각 */
  lastSeen: number;
  /** 마지막에 맞혔는지 */
  lastCorrect: boolean;
}

export function newCard(now: number): CardState {
  return {
    box: 0,
    due: now,
    lapses: 0,
    reps: 0,
    lastSeen: now,
    lastCorrect: true,
  };
}

export function review(
  card: CardState,
  correct: boolean,
  now: number,
): CardState {
  if (!correct) {
    return {
      box: 0,
      due: now + INTERVALS[0],
      lapses: card.lapses + 1,
      reps: card.reps + 1,
      lastSeen: now,
      lastCorrect: false,
    };
  }
  const isDue = card.due <= now;
  const box = isDue ? Math.min(card.box + 1, MAX_BOX) : card.box;
  return {
    box,
    due: isDue ? now + INTERVALS[box] : card.due,
    lapses: card.lapses,
    reps: card.reps + 1,
    lastSeen: now,
    lastCorrect: true,
  };
}

export function isDue(card: CardState, now: number): boolean {
  return card.due <= now;
}

/**
 * 오늘 복습할 카드를 순서대로. 마지막에 틀린 카드 → 많이 늦은(간격 대비) 카드 순.
 * `limit`을 넘지 않는다.
 */
export function dueQueue<K extends string>(
  cards: Readonly<Record<K, CardState>>,
  now: number,
  limit = 30,
): K[] {
  const due = (Object.entries(cards) as [K, CardState][]).filter(([, c]) =>
    isDue(c, now),
  );
  const overdueRatio = (c: CardState) =>
    (now - c.due) / INTERVALS[Math.min(c.box, MAX_BOX)];
  due.sort(([ka, a], [kb, b]) => {
    if (a.lastCorrect !== b.lastCorrect) return a.lastCorrect ? 1 : -1;
    const r = overdueRatio(b) - overdueRatio(a);
    if (r !== 0) return r;
    if (a.lapses !== b.lapses) return b.lapses - a.lapses;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return due.slice(0, limit).map(([k]) => k);
}

/** 진도 지도 색: 아직 안 배움 / 익히는 중 / 익숙함 / 단단함 */
export type Mastery = "none" | "learning" | "familiar" | "solid";

export function masteryOf(card: CardState | undefined): Mastery {
  if (!card) return "none";
  if (card.box <= 1) return "learning";
  if (card.box <= 3) return "familiar";
  return "solid";
}
