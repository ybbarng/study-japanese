// PC 키보드 단축키: 눌린 키가 재생기의 어떤 일인지 정한다. 화면(DOM)을 모르는 순수 함수다.

export type ShortcutAction =
  | { kind: "toggle" }
  | { kind: "seek"; delta: number }
  | { kind: "prev" }
  | { kind: "next" }
  | { kind: "rate"; dir: -1 | 1 }
  | { kind: "help" };

/** 키 이벤트에서 판정에 쓰는 것만 */
export interface KeyInput {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** 입력기로 글자를 조합하는 중(일본어 변환 중 Space는 변환 키다) */
  isComposing: boolean;
  /** 초점이 있는 요소 */
  target: TargetInfo;
}

export interface TargetInfo {
  tag: string;
  /** input의 type */
  type?: string;
  editable: boolean;
}

export const SEEK_SEC = 5;

// 글자를 받지 않는 input. 이 밖의 input(text·search·password 등)은 글 쓰는 칸으로 본다
const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "radio",
  "range",
  "submit",
  "reset",
  "color",
  "file",
  "image",
]);

/** 글을 쓰는 칸이면 단축키를 먹이지 않는다 */
export function isTypingTarget(t: TargetInfo): boolean {
  if (t.editable) return true;
  const tag = t.tag.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag === "input")
    return !NON_TEXT_INPUTS.has((t.type ?? "text").toLowerCase());
  return false;
}

/** 스스로 Space·화살표를 쓰는 요소(단추는 Space로 눌리고, 슬라이더는 화살표로 움직인다) */
function ownsKey(t: TargetInfo, key: string): boolean {
  const tag = t.tag.toLowerCase();
  const type = (t.type ?? "").toLowerCase();
  if (key === " ")
    return (
      tag === "button" ||
      tag === "a" ||
      tag === "summary" ||
      (tag === "input" && NON_TEXT_INPUTS.has(type))
    );
  if (key === "ArrowLeft" || key === "ArrowRight")
    return tag === "input" && (type === "range" || type === "radio");
  return false;
}

export function shortcutFor(e: KeyInput): ShortcutAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(e.target)) return null;
  if (ownsKey(e.target, e.key)) return null;
  switch (e.key) {
    case " ":
      return { kind: "toggle" };
    case "ArrowLeft":
      return e.shiftKey ? { kind: "prev" } : { kind: "seek", delta: -SEEK_SEC };
    case "ArrowRight":
      return e.shiftKey ? { kind: "next" } : { kind: "seek", delta: SEEK_SEC };
    case "[":
      return { kind: "rate", dir: -1 };
    case "]":
      return { kind: "rate", dir: 1 };
    case "?":
      return { kind: "help" };
    default:
      return null;
  }
}

/** 도움말에 보일 목록(판정과 같은 곳에 두어 어긋나지 않게) */
export const SHORTCUT_HELP: { keys: string[]; label: string }[] = [
  { keys: ["Space"], label: "재생 / 멈춤" },
  { keys: ["←", "→"], label: `${SEEK_SEC}초 뒤로 / 앞으로` },
  { keys: ["Shift", "←", "→"], label: "이전 / 다음 트랙" },
  { keys: ["[", "]"], label: "느리게 / 빠르게" },
  { keys: ["?"], label: "이 도움말" },
];
