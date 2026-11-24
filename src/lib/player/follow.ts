import { type ContextCue, cueIndexAt, cueUnsure } from "@/lib/context/cues";
import { normalizeJa } from "@/lib/context/match";

// 화면이 소리를 따라가게 하는 순수 함수들. 재생 위치(초)와 자막 큐만 보고 정한다(DOM은 모른다).

/** 교재 문장 하나가 소리 나는 구간 */
export interface TimedSentence {
  start: number;
  end: number;
  /** 화면에 늘어놓은 문장의 차례 */
  index: number;
}

/**
 * 예문 자막에서 서버가 소책자 문장과 맞춘 줄(카드)을 화면 문장의 차례로 바꾼다.
 * 같은 문장이 여러 번(일본어 → 뜻 → 다시 일본어) 나오면 그만큼 구간이 생긴다. 시작 시각 차례.
 */
export function sentenceTimeline(
  cues: ContextCue[],
  sentences: { ja: string }[],
): TimedSentence[] {
  const byText = new Map<string, number>();
  sentences.forEach((s, i) => {
    const key = normalizeJa(s.ja);
    if (key !== "" && !byText.has(key)) byText.set(key, i);
  });
  const out: TimedSentence[] = [];
  for (const cue of cues) {
    for (const s of cue.card?.sentences ?? []) {
      const index = byText.get(normalizeJa(s.ja));
      if (index === undefined) continue;
      out.push({ start: cue.start, end: cue.end, index });
      break;
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * 지금 강조할 문장의 차례. 마지막으로 소리 난 문장을 다음 문장이 나올 때까지 붙든다
 * (그 사이 한국어 풀이를 들으며 그 문장을 보고 있으니). 첫 문장 전이면 -1.
 */
export function followIndexAt(timeline: TimedSentence[], pos: number): number {
  let found = -1;
  for (const t of timeline) {
    if (t.start <= pos + 0.05) found = t.index;
    else break;
  }
  return found;
}

/** 지금 하는 말 칸에 무엇을 보일지 */
export interface StageView {
  /** 지금 소리 나는 줄(말 없는 틈이면 -1) */
  at: number;
  /** 앞뒤로 흐리게 보일 줄(-1이면 없음) */
  prev: number;
  next: number;
  /**
   * 크게 붙들어 둘 일본어 줄. 지금 줄이 일본어면 그 줄, 한국어 설명 중이면 방금 나온 일본어 줄을
   * 남겨 읽을 시간을 준다. 다만 오래 붙들지는 않는다(heldStillFresh). 붙들 줄이 없으면 -1.
   */
  held: number;
}

/** 교재와 맞춘 일본어 줄을 끝난 뒤 이만큼까지 붙든다 */
export const HOLD_MAX_SEC = 25;
/** 그 뒤로 한국어 줄이 이만큼 지나가면 놓는다(설명이 다른 이야기로 넘어갔다) */
export const HOLD_MAX_LINES = 6;
/**
 * 교재와 맞추지 못한 흐린 받아쓰기 줄은 끝난 뒤 이만큼만 남긴다. 틀린 글일 수 있어
 * 오래 큰 글씨로 둘 까닭이 없고, 붙든 채 "이 문장 반복"·"다시 듣기"가 몇 분 전으로 끌려가던 일을 막는다
 */
export const HOLD_UNSURE_SEC = 4;

/**
 * 붙든 일본어 줄을 pos에서도 계속 보일지. 지금 소리 나는 줄이면 늘 그렇다.
 * 한국어 설명이 길게 이어지면(0강처럼 일본어가 드문 강의) 몇 분 전 줄이 남지 않게 놓는다.
 */
export function heldStillFresh(
  cues: ContextCue[],
  held: number,
  pos: number,
): boolean {
  const cue = cues[held];
  if (pos <= cue.end) return true;
  const since = pos - cue.end;
  if (cueUnsure(cue)) return since <= HOLD_UNSURE_SEC;
  if (since > HOLD_MAX_SEC) return false;
  let lines = 0;
  for (let i = held + 1; i < cues.length && cues[i].start <= pos; i++)
    if (cues[i].lang === "ko") lines++;
  return lines < HOLD_MAX_LINES;
}

export function stageView(cues: ContextCue[], pos: number): StageView {
  const at = cueIndexAt(cues, pos);
  let before = -1;
  for (let i = 0; i < cues.length && cues[i].start <= pos; i++) before = i;
  let held = -1;
  for (let i = before; i >= 0; i--)
    if (cues[i].lang === "ja") {
      held = i;
      break;
    }
  if (held >= 0 && held !== at && !heldStillFresh(cues, held, pos)) held = -1;
  const prev = at >= 0 ? at - 1 : before;
  const next = before + 1 < cues.length ? before + 1 : -1;
  return { at, prev, next, held };
}

/**
 * 지금 칸의 반복 단추. 붙든 일본어 줄과 지금 말(한국어 설명)이 함께 보이면 단추가 무엇을
 * 반복하는지 헷갈리므로 둘로 나눈다: 붙든 일본어 줄 반복(그 줄 아래), 지금 말 반복(지금 줄).
 * 붙든 줄은 heldStillFresh 안에서만 보이므로(맞춘 줄 25초·흐린 줄 4초) 일본어 반복이 몇 분 전으로
 * 끌려가지 않는다. 하나만 보일 때는 그 줄을 잡는 "이 문장 반복" 하나다.
 * 지금 소리 나는 줄이 붙든 줄과 다르면 늘 둘로 나누고, "지금 말 반복"은 화면의 지금 줄(hereCue)을 그대로
 * 잡는다. L 키 규칙(resolveLoopCue)은 설명이 막 시작했거나 방금 줄을 눌러 옮겼을 때 붙든 일본어 줄을
 * 잡기도 해서, 단추 하나가 보이는 줄과 다른 구간을 되풀이하던 일을 막는다.
 * 말 없는 틈(지금 줄이 없음)에서 지금 말 반복이 잡을 줄(hereTarget)이 붙든 줄이면 같은 구간이므로 하나만 둔다.
 */
export function stageLoops(
  v: StageView,
  hereTarget?: number,
): {
  /** 붙든 일본어 줄 반복 단추를 따로 둘지 */
  held: boolean;
  /** 지금 줄 단추의 글 */
  hereLabel: string;
  /** 지금 줄 단추가 그대로 잡을 줄. -1이면 L 키 규칙(resolveLoopCue)을 따른다 */
  hereCue: number;
} {
  const split =
    v.held >= 0 && v.held !== v.at && (v.at >= 0 || hereTarget !== v.held);
  if (!split) return { held: false, hereLabel: "이 문장 반복", hereCue: -1 };
  if (v.at >= 0)
    return { held: true, hereLabel: "지금 말 반복", hereCue: v.at };
  return { held: true, hereLabel: "방금 말 반복", hereCue: -1 };
}

/** 이 강 강의를 틀었을 때 PC 무대가 한 화면에 들어오게 굴릴 거리(px, 0이면 굴리지 않는다) */
export function stageScrollBy(
  /** 재생 단추 카드(무대 바로 위)의 화면 속 위치 */
  anchorTop: number,
  /** 무대의 화면 속 위치 */
  stageTop: number,
  viewHeight: number,
  /** 일본어·뜻·낱말·그림·앞뒤 줄이 다 찼을 때 무대 높이 */
  stageHeight = STAGE_FULL_PX,
  margin = 24,
): number {
  const bottomLine = viewHeight - margin;
  if (stageTop + stageHeight <= bottomLine) return 0;
  // 재생 단추 카드도 함께 보이게 올리되, 그러면 무대가 안 들어가면 무대를 맨 위로
  const withCard = anchorTop - margin;
  const by =
    stageTop - withCard + stageHeight <= bottomLine
      ? withCard
      : stageTop - margin;
  return Math.max(0, Math.round(by));
}

/** PC 무대가 다 찼을 때의 대략 높이(1440×900에서 잰 값) */
export const STAGE_FULL_PX = 560;

/** 화면을 굴려 지금 문장을 보여야 하는지: 보기 좋은 띠(위쪽 12%~아래 가림 위) 밖이면 */
export function needsScroll(
  box: { top: number; bottom: number },
  view: {
    height: number;
    /** 위에 붙어 가리는 높이(폰 강 화면 위 재생기) */
    coveredTop?: number;
    /** 아래에 떠서 가리는 높이(폰 재생 막대) */
    coveredBottom: number;
  },
): boolean {
  const topLine = Math.max(view.height * 0.12, (view.coveredTop ?? 0) + 16);
  const bottomLine = view.height - view.coveredBottom - view.height * 0.08;
  if (box.bottom - box.top > bottomLine - topLine) return box.top > topLine;
  return box.top < topLine || box.bottom > bottomLine;
}

/** 손으로 화면을 굴린 뒤 이만큼은 따라 굴리지 않는다 */
export const FOLLOW_HOLD_MS = 4000;
