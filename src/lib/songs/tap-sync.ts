import type { SongLine } from "./schema";

// 박자 맞추기: 노래를 틀어 두고 줄이 시작될 때마다 눌러 그 줄의 시작 시각을 적는다.
// 화면(키·단추)을 모르는 순수 함수다.

export interface TapState {
  /** 줄마다 시작 시각(아직 모르면 undefined) */
  times: (number | undefined)[];
  /** 다음에 누르면 시각이 적힐 줄 */
  cursor: number;
}

/** 소수 둘째 자리(10ms)까지만 남긴다 */
function round(sec: number): number {
  return Math.round(Math.max(0, sec) * 100) / 100;
}

/** 지금 저장된 시각에서 시작한다. 커서는 from번째 줄 */
export function startTaps(
  lines: readonly Pick<SongLine, "start">[],
  from = 0,
): TapState {
  return {
    times: lines.map((l) => l.start),
    cursor: Math.max(0, Math.min(from, lines.length)),
  };
}

/** 지금 줄의 시작을 t초로 적고 다음 줄로 넘어간다. 마지막 줄 뒤에서는 아무것도 하지 않는다 */
export function tap(state: TapState, t: number): TapState {
  if (state.cursor >= state.times.length) return state;
  const times = [...state.times];
  times[state.cursor] = round(t);
  return { times, cursor: state.cursor + 1 };
}

/** 한 줄 되돌린다(적었던 시각은 남겨 두고 커서만 앞으로). 다시 누르면 새 시각으로 바뀐다 */
export function undoTap(state: TapState): TapState {
  return { ...state, cursor: Math.max(0, state.cursor - 1) };
}

/** i번째 줄 시각을 delta초만큼 앞뒤로 옮긴다(0 아래로는 가지 않는다) */
export function nudge(state: TapState, i: number, delta: number): TapState {
  const now = state.times[i];
  if (now === undefined) return state;
  const times = [...state.times];
  times[i] = round(now + delta);
  return { ...state, times };
}

/** 커서를 i번째 줄로(그 줄부터 다시 맞출 때) */
export function moveCursor(state: TapState, i: number): TapState {
  return { ...state, cursor: Math.max(0, Math.min(i, state.times.length)) };
}

/** 적은 시각을 가사 줄에 넣는다. 끝 시각이 새 시작보다 앞서게 되면 끝 시각은 뺀다 */
export function applyTaps(
  lines: readonly SongLine[],
  state: TapState,
): SongLine[] {
  return lines.map((line, i) => {
    const { start: _start, end, ...rest } = line;
    const start = state.times[i];
    const out: SongLine = { ...rest };
    if (start !== undefined) out.start = start;
    if (end !== undefined && (start === undefined || end > start))
      out.end = end;
    return out;
  });
}

export interface ClockSample {
  /** 재생기가 마지막으로 알린 위치(초) */
  pos: number;
  /** 그 위치를 받은 때(밀리초, performance.now) */
  at: number;
}

/** 재생기는 위치를 1초에 네 번쯤 알린다. 그 사이를 흐른 시간으로 메워 누른 순간의 위치를 잡는다 */
export const MAX_GAP_MS = 500;

export function estimatePosition(
  sample: ClockSample,
  now: number,
  rate: number,
  playing: boolean,
): number {
  if (!playing) return sample.pos;
  const elapsed = Math.min(Math.max(0, now - sample.at), MAX_GAP_MS);
  return sample.pos + (elapsed / 1000) * rate;
}
