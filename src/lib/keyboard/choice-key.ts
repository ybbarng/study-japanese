import { isTypingTarget, type KeyInput } from "@/lib/player/shortcuts";

// 보기 고르기(가나 4지선다, 드릴 고르기)를 숫자 키로. 1번 보기가 0이다.

export function choiceIndexFor(
  e: Pick<
    KeyInput,
    "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing" | "target"
  >,
  count: number,
): number | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(e.target)) return null;
  if (!/^[1-9]$/.test(e.key)) return null;
  const i = Number(e.key) - 1;
  return i < count ? i : null;
}
