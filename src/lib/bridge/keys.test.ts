import { describe, expect, it } from "vitest";
import type { KeyInput, TargetInfo } from "@/lib/player/shortcuts";
import { bridgeKeyAction } from "./keys";

const BODY: TargetInfo = { tag: "BODY", editable: false };

function press(key: string, extra: Partial<KeyInput> = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    target: BODY,
    ...extra,
  };
}

describe("bridgeKeyAction: 첫 읽기 키", () => {
  it("Enter는 다음 문장, Backspace는 앞 문장이다", () => {
    expect(bridgeKeyAction(press("Enter"))).toBe("next");
    expect(bridgeKeyAction(press("Backspace"))).toBe("prev");
  });

  it("1·2·3은 한글 소리·문장 듣기·뜻이다", () => {
    expect(bridgeKeyAction(press("1"))).toBe("sounds");
    expect(bridgeKeyAction(press("2"))).toBe("listen");
    expect(bridgeKeyAction(press("3"))).toBe("meaning");
  });

  it("단추에 초점이 있으면 Enter는 그 단추가 받는다(뜻 보기 단추를 누른 뒤 Enter가 문장까지 넘기지 않게)", () => {
    expect(
      bridgeKeyAction(
        press("Enter", { target: { tag: "BUTTON", editable: false } }),
      ),
    ).toBeNull();
  });

  it("재생기 단축키(Space·화살표)는 받지 않는다", () => {
    expect(bridgeKeyAction(press(" "))).toBeNull();
    expect(bridgeKeyAction(press("ArrowRight"))).toBeNull();
  });

  it("Ctrl·Cmd와 함께 누른 키나 입력기로 조합 중인 키는 받지 않는다", () => {
    expect(bridgeKeyAction(press("1", { metaKey: true }))).toBeNull();
    expect(bridgeKeyAction(press("Enter", { isComposing: true }))).toBeNull();
  });
});
