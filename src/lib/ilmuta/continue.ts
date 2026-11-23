import type { LessonProgress } from "./progress";

// "이어서 하기": 평일엔 걸으며 다음 강을 듣고, 주말엔 앉아서 밀린 강의 문장을 쓴다.

export type ContinuePick =
  | { kind: "listen"; no: number }
  | { kind: "write"; no: number }
  | { kind: "done" };

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 서버가 UTC로 돌아도 한국 시각으로 토·일인지 본다 */
export function isWeekendKst(nowMs: number): boolean {
  const day = new Date(nowMs + KST_OFFSET_MS).getUTCDay();
  return day === 0 || day === 6;
}

/** 강의를 들었는데 문장을 아직 다 쓰지 않은 강(차례대로) */
export function pendingWriting(progress: LessonProgress[]): number[] {
  return progress
    .filter((p) => p.lectureDone && !p.writingDone)
    .map((p) => p.no);
}

export function pickContinue(
  progress: LessonProgress[],
  nowMs: number,
): ContinuePick {
  const sorted = [...progress].sort((a, b) => a.no - b.no);
  const pending = pendingWriting(sorted);
  if (isWeekendKst(nowMs) && pending.length > 0)
    return { kind: "write", no: pending[0] };
  const nextListen = sorted.find((p) => !p.lectureDone);
  if (nextListen) return { kind: "listen", no: nextListen.no };
  if (pending.length > 0) return { kind: "write", no: pending[0] };
  return { kind: "done" };
}
