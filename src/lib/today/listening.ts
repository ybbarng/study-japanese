import { DAY_MS, kstDayKey } from "./kst";

// 오늘 들은 시간과 이어서 공부한 날. 배지·압박 없이 가볍게 보여 주려고 센다.

export interface ListenRecord {
  startedAt: number;
  listenedSec: number;
}

/** 오늘(한국 날짜) 들은 초 */
export function listenedSecToday(
  events: readonly ListenRecord[],
  nowMs: number,
): number {
  const today = kstDayKey(nowMs);
  let sec = 0;
  for (const e of events)
    if (kstDayKey(e.startedAt) === today) sec += e.listenedSec;
  return Math.round(sec);
}

/** 들은 기록이 있는 한국 날짜들 */
export function listenDays(events: readonly ListenRecord[]): string[] {
  return [...new Set(events.map((e) => kstDayKey(e.startedAt)))].sort();
}

/** 오늘까지 이어서 공부한 날 수. 오늘 아직 안 했으면 어제까지를 센다 */
export function studyStreak(days: ReadonlySet<string>, nowMs: number): number {
  let t = nowMs;
  if (!days.has(kstDayKey(t))) t -= DAY_MS;
  let n = 0;
  while (days.has(kstDayKey(t))) {
    n += 1;
    t -= DAY_MS;
  }
  return n;
}

/** 분 단위 짧은 말: 0분이면 null, 1분 미만은 "1분 미만" */
export function minutesLabel(sec: number): string | null {
  if (sec <= 0) return null;
  if (sec < 60) return "1분 미만";
  return `${Math.floor(sec / 60)}분`;
}
