import { isTypingTarget, type KeyInput } from "@/lib/player/shortcuts";

// 박자 맞추기 화면의 키: 눌린 키가 무슨 일인지 정한다(화면을 모르는 순수 함수).

export type TapKeyAction = "tap" | "undo";

/** Space는 지금 줄 시작, Backspace는 한 줄 되돌리기. 글 쓰는 칸·입력기 조합 중·조합 키는 건너뛴다 */
export function tapKeyAction(e: KeyInput): TapKeyAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(e.target)) return null;
  if (e.key === " ") return "tap";
  if (e.key === "Backspace") return "undo";
  return null;
}
