// 한 문장 반복: 자막 구간 하나를 되풀이해 듣고, 따라 말하기 간격을 켰으면 문장 끝에서 잠깐 멈춘다.
// 재생 위치가 바뀔 때마다 무엇을 할지 정하는 순수 함수다(<audio>는 GlobalPlayer가 다룬다).

export interface CueLoop {
  book: string;
  item: string;
  start: number;
  end: number;
}

export type LoopStep =
  | { kind: "none" }
  /** 구간 밖으로 옮겨 갔다(사용자가 다른 곳을 눌렀다): 반복을 푼다 */
  | { kind: "clear" }
  /** 문장 끝에 닿았다: pauseSec만큼 쉬고 start로 돌아간다 */
  | { kind: "back"; pauseSec: number };

/** 구간 앞뒤 이만큼은 구간 안으로 본다(whisper 시각이 조금씩 어긋나고, 위치는 1초에 네 번쯤 온다) */
const SLACK_BEFORE = 0.5;
const SLACK_AFTER = 1.5;

/** 문장 끝에서 쉬는 시간: 문장 길이 + 0.8초, 1.5~15초. 간격을 껐으면 쉬지 않는다 */
export function loopPauseSec(loop: CueLoop, shadowGap: boolean): number {
  if (!shadowGap) return 0;
  return Math.min(15, Math.max(1.5, loop.end - loop.start + 0.8));
}

export function cueLoopStep(
  loop: CueLoop | null,
  at: { book: string | null; item: string | null; pos: number },
  shadowGap: boolean,
): LoopStep {
  if (!loop) return { kind: "none" };
  if (at.book !== loop.book || at.item !== loop.item) return { kind: "clear" };
  if (at.pos < loop.start - SLACK_BEFORE || at.pos > loop.end + SLACK_AFTER)
    return { kind: "clear" };
  if (at.pos >= loop.end)
    return { kind: "back", pauseSec: loopPauseSec(loop, shadowGap) };
  return { kind: "none" };
}

/** 반복을 고를 때 볼 자막 구간(시각만) */
export interface TimedCue {
  start: number;
  end: number;
}

/** 줄을 눌러 옮긴 뒤 이만큼 안에 반복을 걸면 그 줄을 잡는다 */
const SEEK_MEMORY_SEC = 4;
/** 새 문장이 시작된 지 이만큼 안이면 사람은 아직 앞 문장을 보고 있다(보고 누르는 데 걸리는 시간) */
const REACTION_SEC = 0.8;
/** 앞 문장이 끝난 뒤 이만큼 안일 때만 앞 문장을 잡는다(그보다 오래 비었으면 앞 문장은 이미 화면에서 내려갔다) */
const PREV_VISIBLE_SEC = 1.5;
/** 줄을 눌러 옮기면 mp3는 그 시각보다 조금 앞에 내려앉기도 한다 */
const SEEK_LANDING_SEC = 0.25;

function lastStartedBefore(cues: TimedCue[], t: number): number {
  let found = -1;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].start <= t) found = i;
    else break;
  }
  return found;
}

/**
 * "이 문장 반복"(단추·L 키)이 잡을 구간의 차례. -1이면 잡을 것이 없다.
 * - 다른 줄의 단추를 눌렀으면(pressed가 지금 줄이 아니면) 그 줄.
 * - 방금 자막 줄을 눌러 옮겼으면(seek) 그 줄. mp3가 조금 앞에 내려앉아도 앞 줄로 새지 않는다.
 * - 지금 줄이 막 시작됐으면(보고 누르는 사이에 넘어갔으면) 화면에 보이던 앞 줄.
 * cues는 시작 시각 차례다.
 */
export function resolveLoopCue(
  cues: TimedCue[],
  pos: number,
  opts: {
    /** 눌린 단추가 붙어 있던 줄(L 키면 없음) */
    pressed?: number | null;
    /** 마지막으로 자막 줄을 눌러 옮긴 곳과 그 뒤 지난 시간 */
    seek?: { sec: number; ageSec: number } | null;
  } = {},
): number {
  const here = lastStartedBefore(cues, pos + SEEK_LANDING_SEC);
  const pressed = opts.pressed ?? null;
  if (pressed !== null && pressed !== here) return pressed;

  const seek = opts.seek;
  if (seek && seek.ageSec >= 0 && seek.ageSec < SEEK_MEMORY_SEC) {
    const sought = cues.findIndex((c) => Math.abs(c.start - seek.sec) < 0.05);
    if (
      sought >= 0 &&
      pos >= cues[sought].start - 1 &&
      pos <= cues[sought].end + SLACK_AFTER
    )
      return sought;
  }

  if (here < 0) return -1;
  const prev = here - 1;
  if (
    prev >= 0 &&
    pos - cues[here].start < REACTION_SEC &&
    cues[here].start - cues[prev].end < PREV_VISIBLE_SEC
  )
    return prev;
  return here;
}

/** 같은 구간이면 풀고, 아니면 그 구간으로 건다 */
export function toggleLoop(
  current: CueLoop | null,
  next: CueLoop,
): CueLoop | null {
  if (
    current &&
    current.book === next.book &&
    current.item === next.item &&
    current.start === next.start
  )
    return null;
  return next;
}
