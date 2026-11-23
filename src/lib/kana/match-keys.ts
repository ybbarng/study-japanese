import { isTypingTarget, type KeyInput } from "@/lib/player/shortcuts";

// 짝 맞추기를 PC 키보드로. 판은 PC에서 4칸×3줄이라, 자판의 왼손 세 줄(QWER·ASDF·ZXCV)을
// 판 모양 그대로 칸에 맞춘다. 재생기 단축키(Space·화살표·[ ]·?)와 겹치지 않는다.

/** 칸 순서(줄마다 왼쪽부터)대로 붙는 키 */
export const MATCH_KEYS = [
  "Q",
  "W",
  "E",
  "R",
  "A",
  "S",
  "D",
  "F",
  "Z",
  "X",
  "C",
  "V",
] as const;

export type MatchKeyInput = Pick<
  KeyInput,
  "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing" | "target"
> & {
  /** 자판 위치(KeyQ 등). 한글 입력 상태에서도 위치는 같다 */
  code: string;
};

export type MatchKeyAction =
  | { kind: "tile"; index: number }
  | { kind: "cancel" };

/** 눌린 키가 몇 번째 칸인지(또는 고른 것 풀기). 해당 없으면 null */
export function matchKeyAction(
  e: MatchKeyInput,
  count: number,
): MatchKeyAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(e.target)) return null;
  if (e.key === "Escape") return { kind: "cancel" };
  // 한글 자판이 켜져 있으면 key는 'ㅂ'이 되므로 위치(code)로 먼저 본다
  const byCode = /^Key([A-Z])$/.exec(e.code)?.[1];
  const letter = byCode ?? (e.key.length === 1 ? e.key.toUpperCase() : "");
  const index = (MATCH_KEYS as readonly string[]).indexOf(letter);
  if (index < 0 || index >= count) return null;
  return { kind: "tile", index };
}
