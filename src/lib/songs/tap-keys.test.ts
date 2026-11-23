import { describe, expect, it } from "vitest";
import type { KeyInput } from "@/lib/player/shortcuts";
import { tapKeyAction } from "./tap-keys";

function key(k: string, over: Partial<KeyInput> = {}): KeyInput {
  return {
    key: k,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    target: { tag: "BODY", editable: false },
    ...over,
  };
}

describe("tapKeyAction", () => {
  it("Space는 지금 줄 시작, Backspace는 되돌리기", () => {
    expect(tapKeyAction(key(" "))).toBe("tap");
    expect(tapKeyAction(key("Backspace"))).toBe("undo");
  });

  it("단추에 초점이 있어도 Space를 박자로 받는다(재생 단추를 누른 뒤 바로 맞추므로)", () => {
    expect(
      tapKeyAction(key(" ", { target: { tag: "BUTTON", editable: false } })),
    ).toBe("tap");
  });

  it("글 쓰는 칸·입력기 조합 중·Cmd 조합은 건너뛴다", () => {
    expect(
      tapKeyAction(
        key(" ", { target: { tag: "INPUT", type: "text", editable: false } }),
      ),
    ).toBeNull();
    expect(tapKeyAction(key(" ", { isComposing: true }))).toBeNull();
    expect(tapKeyAction(key("Backspace", { metaKey: true }))).toBeNull();
  });

  it("다른 키는 아무 일도 아니다", () => {
    expect(tapKeyAction(key("ArrowRight"))).toBeNull();
  });
});
