// 실제로 들은 시간을 잰다. timeupdate마다 재생 위치가 조금씩 늘어난 만큼만 더하고,
// 건너뛰기(앞으로 감기·구간 이동)처럼 크게 뛴 것은 듣지 않은 것으로 본다.

export interface ListenMeter {
  lastPos: number | null;
  listenedSec: number;
}

export const MAX_STEP_SEC = 2; // timeupdate는 보통 0.25초 간격. 속도 2배여도 1초 안쪽.

export function newMeter(): ListenMeter {
  return { lastPos: null, listenedSec: 0 };
}

export function tick(meter: ListenMeter, pos: number): ListenMeter {
  if (meter.lastPos === null)
    return { lastPos: pos, listenedSec: meter.listenedSec };
  const step = pos - meter.lastPos;
  const add = step > 0 && step <= MAX_STEP_SEC ? step : 0;
  return { lastPos: pos, listenedSec: meter.listenedSec + add };
}

/** 멈췄다가 다시 재생하거나 위치를 옮긴 뒤에는 그 지점부터 다시 잰다. */
export function resetPosition(meter: ListenMeter): ListenMeter {
  return { lastPos: null, listenedSec: meter.listenedSec };
}

/** 끝까지 들었다고 볼지: 길이의 90% 이상을 실제로 들었을 때. */
export function isCompleted(listenedSec: number, durationSec: number): boolean {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return false;
  return listenedSec >= durationSec * 0.9;
}
