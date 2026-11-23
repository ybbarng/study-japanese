import { isTypingTarget, type KeyInput } from "@/lib/player/shortcuts";

// 가나 첫 읽기(다리 레슨)를 PC 키보드로. 화살표·Space는 재생기 단축키(되감기·멈춤)라 쓰지 않는다.

export type BridgeKeyAction = "next" | "prev" | "sounds" | "listen" | "meaning";

/** 도움말에 보일 목록(판정과 같은 곳에 두어 어긋나지 않게) */
export const BRIDGE_KEY_HELP: { key: string; label: string }[] = [
  { key: "1", label: "한글 소리 보기 / 가리기" },
  { key: "2", label: "문장 듣기" },
  { key: "3", label: "뜻 보기 / 가리기" },
  { key: "Enter", label: "다음 문장" },
  { key: "Backspace", label: "앞 문장" },
];

// 스스로 Enter를 받는 요소(단추·링크는 Enter로 눌린다). 그때는 그 요소가 받게 둔다
const OWNS_ENTER = new Set(["button", "a", "summary", "select"]);

export function bridgeKeyAction(
  e: Pick<
    KeyInput,
    "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing" | "target"
  >,
): BridgeKeyAction | null {
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return null;
  if (isTypingTarget(e.target)) return null;
  switch (e.key) {
    case "Enter":
      return OWNS_ENTER.has(e.target.tag.toLowerCase()) ? null : "next";
    case "Backspace":
      return "prev";
    case "1":
      return "sounds";
    case "2":
      return "listen";
    case "3":
      return "meaning";
    default:
      return null;
  }
}
