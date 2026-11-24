import { describe, expect, it } from "vitest";
import type { KeyInput, TargetInfo } from "@/lib/player/shortcuts";
import { panelKeyFor } from "./panel-keys";

const BODY: TargetInfo = { tag: "BODY", editable: false };

function key(k: string, over: Partial<KeyInput> = {}): KeyInput {
  return {
    key: k,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    target: BODY,
    ...over,
  };
}

describe("panelKeyFor", () => {
  it("←·→는 초점이 창 밖(본문)에 있어도 앞뒤 낱말이다", () => {
    expect(panelKeyFor(key("ArrowLeft"))).toBe("prev");
    expect(panelKeyFor(key("ArrowRight"))).toBe("next");
  });

  it("창 안 단추에 초점이 있어도 ←·→는 앞뒤 낱말이다", () => {
    const button = { tag: "BUTTON", editable: false };
    expect(panelKeyFor(key("ArrowRight", { target: button }))).toBe("next");
  });

  it("Esc는 창을 닫는다", () => {
    expect(panelKeyFor(key("Escape"))).toBe("close");
  });

  it("Shift+←·→(앞뒤 트랙)와 Space·L은 재생기에 넘긴다", () => {
    expect(panelKeyFor(key("ArrowLeft", { shiftKey: true }))).toBeNull();
    expect(panelKeyFor(key(" "))).toBeNull();
    expect(panelKeyFor(key("l"))).toBeNull();
  });

  it("재생 위치 슬라이더와 글 쓰는 칸에 초점이 있으면 화살표를 가져가지 않는다", () => {
    const range = { tag: "INPUT", type: "range", editable: false };
    const text = { tag: "INPUT", type: "text", editable: false };
    expect(panelKeyFor(key("ArrowLeft", { target: range }))).toBeNull();
    expect(panelKeyFor(key("ArrowLeft", { target: text }))).toBeNull();
  });

  it("입력기 조합 중이거나 Ctrl·Cmd가 눌렸으면 아무 일도 하지 않는다", () => {
    expect(panelKeyFor(key("ArrowLeft", { isComposing: true }))).toBeNull();
    expect(panelKeyFor(key("ArrowLeft", { metaKey: true }))).toBeNull();
  });
});
