// 한국 시각 날짜 계산. 서버가 UTC로 돌아도 사용자의 하루(한국 자정 기준)로 센다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface KstDate {
  year: number;
  /** 1~12 */
  month: number;
  day: number;
  /** 0: 일요일 ~ 6: 토요일 */
  weekday: number;
}

export function kstDate(nowMs: number): KstDate {
  const d = new Date(nowMs + KST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
  };
}

/** 한국 날짜 열쇠 `YYYY-MM-DD` */
export function kstDayKey(nowMs: number): string {
  const { year, month, day } = kstDate(nowMs);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 한국 시각으로 그날 0시의 ms */
export function kstMidnight(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day) - KST_OFFSET_MS;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isWeekend(d: KstDate): boolean {
  return d.weekday === 0 || d.weekday === 6;
}
