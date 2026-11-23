/** 2027년 2분기 계획: 달마다 공부할 과 범위. 달 말에 그 범위로 시험(90점 목표)을 본다. */
export interface MonthRange {
  month: 4 | 5 | 6;
  from: number;
  to: number;
}

export const MONTHS: readonly MonthRange[] = [
  { month: 4, from: 1, to: 24 },
  { month: 5, from: 25, to: 41 },
  { month: 6, from: 42, to: 56 },
];

export const PASS_SCORE = 90;

export function monthRange(month: number): MonthRange | null {
  return MONTHS.find((m) => m.month === month) ?? null;
}

export function monthOfLesson(no: number): MonthRange | null {
  return MONTHS.find((m) => no >= m.from && no <= m.to) ?? null;
}
