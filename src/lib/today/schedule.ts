import { DAY_MS, daysInMonth, kstDate, kstMidnight } from "./kst";

// 2027년 학습 일정: 1월 1일 시작, 1분기 일무따 60강, 2분기 일문따 56과.

export const START = { year: 2027, month: 1, day: 1 } as const;
const START_MS = kstMidnight(START.year, START.month, START.day);

/** 시작일까지 남은 날(시작일 당일과 그 뒤는 0). 12월 31일이면 1 */
export function daysUntilStart(nowMs: number): number {
  if (nowMs >= START_MS) return 0;
  const { year, month, day } = kstDate(nowMs);
  return Math.round((START_MS - kstMidnight(year, month, day)) / DAY_MS);
}

export type Book = "ilmuta" | "ilmunta";

export interface MonthGoal {
  book: Book;
  /** 이번 달에 끝낼 강·과 번호 범위(양 끝 포함) */
  from: number;
  to: number;
}

const GOALS: Record<number, MonthGoal> = {
  1: { book: "ilmuta", from: 0, to: 18 },
  2: { book: "ilmuta", from: 19, to: 38 },
  3: { book: "ilmuta", from: 39, to: 60 },
  4: { book: "ilmunta", from: 1, to: 24 },
  5: { book: "ilmunta", from: 25, to: 41 },
  6: { book: "ilmunta", from: 42, to: 56 },
};

/** 그달 목표. 2027년 1~6월 밖이면 null */
export function monthGoal(year: number, month: number): MonthGoal | null {
  if (year !== START.year) return null;
  return GOALS[month] ?? null;
}

/** 지금 주로 할 책: 1분기는 일무따, 4월부터는 일문따 */
export function focusBook(nowMs: number): Book {
  const { year, month } = kstDate(nowMs);
  return year === START.year && month <= 3 ? "ilmuta" : "ilmunta";
}

export interface MonthQuota {
  goal: MonthGoal;
  /** 범위 안에서 끝낸 강·과 수 */
  done: number;
  total: number;
  remaining: number;
  /** 오늘을 넣어 이달에 남은 날 */
  daysLeft: number;
  /** 남은 것을 남은 날에 고르게 나눈 하루 몫(올림). 다 끝냈으면 0 */
  perDay: number;
}

export function monthQuota(
  goal: MonthGoal,
  doneNos: ReadonlySet<number>,
  nowMs: number,
): MonthQuota {
  const { year, month, day } = kstDate(nowMs);
  const total = goal.to - goal.from + 1;
  let done = 0;
  for (let no = goal.from; no <= goal.to; no++) if (doneNos.has(no)) done++;
  const remaining = total - done;
  const daysLeft = daysInMonth(year, month) - day + 1;
  return {
    goal,
    done,
    total,
    remaining,
    daysLeft,
    perDay: remaining === 0 ? 0 : Math.ceil(remaining / daysLeft),
  };
}
