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
