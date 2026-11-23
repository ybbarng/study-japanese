import { describe, expect, it } from "vitest";
import { stepRate } from "./rates";
import { type KeyInput, shortcutFor, type TargetInfo } from "./shortcuts";

const BODY: TargetInfo = { tag: "BODY", editable: false };

function press(key: string, extra: Partial<KeyInput> = {}): KeyInput {
  return {
    key,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    target: BODY,
    ...extra,
  };
}

describe("shortcutFor: 키와 할 일", () => {
  it("Space는 재생·멈춤이다", () => {
    expect(shortcutFor(press(" "))).toEqual({ kind: "toggle" });
  });

  it("←/→는 5초씩 옮기고, Shift를 함께 누르면 이전·다음 트랙이다", () => {
    expect(shortcutFor(press("ArrowLeft"))).toEqual({
      kind: "seek",
      delta: -5,
    });
    expect(shortcutFor(press("ArrowRight"))).toEqual({
      kind: "seek",
      delta: 5,
    });
    expect(shortcutFor(press("ArrowLeft", { shiftKey: true }))).toEqual({
      kind: "prev",
    });
    expect(shortcutFor(press("ArrowRight", { shiftKey: true }))).toEqual({
      kind: "next",
    });
  });

  it("[ ]는 속도를 한 단계씩, ?는 도움말이다", () => {
    expect(shortcutFor(press("["))).toEqual({ kind: "rate", dir: -1 });
    expect(shortcutFor(press("]"))).toEqual({ kind: "rate", dir: 1 });
    expect(shortcutFor(press("?", { shiftKey: true }))).toEqual({
      kind: "help",
    });
  });

  it("단축키가 아닌 키는 아무 일도 하지 않는다", () => {
    expect(shortcutFor(press("a"))).toBeNull();
    expect(shortcutFor(press("1"))).toBeNull();
  });
});

describe("shortcutFor: 먹지 않아야 할 때", () => {
  it("글 쓰는 칸(입력칸·글상자·편집 가능한 곳)에서는 어떤 키도 가로채지 않는다", () => {
    for (const target of [
      { tag: "INPUT", type: "text", editable: false },
      { tag: "INPUT", editable: false },
      { tag: "TEXTAREA", editable: false },
      { tag: "DIV", editable: true },
      { tag: "SELECT", editable: false },
    ])
      expect(shortcutFor(press(" ", { target }))).toBeNull();
    expect(
      shortcutFor(
        press("ArrowLeft", { target: { tag: "TEXTAREA", editable: false } }),
      ),
    ).toBeNull();
  });

  it("입력기로 일본어를 조합하는 중에는 Space를 변환에 맡긴다", () => {
    expect(shortcutFor(press(" ", { isComposing: true }))).toBeNull();
  });

  it("Ctrl·Cmd·Alt를 함께 누르면 브라우저 단축키로 둔다", () => {
    expect(shortcutFor(press("ArrowLeft", { metaKey: true }))).toBeNull();
    expect(shortcutFor(press("]", { ctrlKey: true }))).toBeNull();
    expect(shortcutFor(press(" ", { altKey: true }))).toBeNull();
  });

  it("단추에 초점이 있으면 Space는 그 단추를 누르게 둔다", () => {
    expect(
      shortcutFor(press(" ", { target: { tag: "BUTTON", editable: false } })),
    ).toBeNull();
    // 같은 단추에서도 화살표는 재생기 단축키다
    expect(
      shortcutFor(
        press("ArrowRight", { target: { tag: "BUTTON", editable: false } }),
      ),
    ).toEqual({ kind: "seek", delta: 5 });
  });

  it("재생 위치 슬라이더에 초점이 있으면 화살표는 슬라이더를 움직이게 둔다", () => {
    const range = { tag: "INPUT", type: "range", editable: false };
    expect(shortcutFor(press("ArrowLeft", { target: range }))).toBeNull();
    expect(shortcutFor(press("]", { target: range }))).toEqual({
      kind: "rate",
      dir: 1,
    });
  });
});

describe("stepRate", () => {
  it("한 단계씩 느리게·빠르게 바꾼다", () => {
    expect(stepRate(1, 1)).toBe(1.15);
    expect(stepRate(1, -1)).toBe(0.9);
  });

  it("가장 느린·빠른 단계에서는 더 가지 않는다", () => {
    expect(stepRate(0.75, -1)).toBe(0.75);
    expect(stepRate(1.3, 1)).toBe(1.3);
  });

  it("목록에 없는 속도면 가장 가까운 단계에서 움직인다", () => {
    expect(stepRate(1.1, 1)).toBe(1.3);
    expect(stepRate(1.1, -1)).toBe(1);
  });
});
