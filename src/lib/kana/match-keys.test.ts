import { describe, expect, it } from "vitest";
import type { TargetInfo } from "@/lib/player/shortcuts";
import { type MatchKeyInput, matchKeyAction } from "./match-keys";

const BODY: TargetInfo = { tag: "BODY", editable: false };

function press(
  code: string,
  key: string,
  extra: Partial<MatchKeyInput> = {},
): MatchKeyInput {
  return {
    code,
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    target: BODY,
    ...extra,
  };
}

describe("matchKeyAction: 짝 맞추기 키", () => {
  it("자판 왼손 세 줄이 판의 칸 순서대로 붙는다(Q=첫 칸, R=첫 줄 끝, A=둘째 줄 첫 칸, V=마지막 칸)", () => {
    expect(matchKeyAction(press("KeyQ", "q"), 12)).toEqual({
      kind: "tile",
      index: 0,
    });
    expect(matchKeyAction(press("KeyR", "r"), 12)).toEqual({
      kind: "tile",
      index: 3,
    });
    expect(matchKeyAction(press("KeyA", "a"), 12)).toEqual({
      kind: "tile",
      index: 4,
    });
    expect(matchKeyAction(press("KeyV", "v"), 12)).toEqual({
      kind: "tile",
      index: 11,
    });
  });

  it("한글 자판이 켜져 있어도(key가 ㅂ) 자판 위치로 같은 칸을 고른다", () => {
    expect(matchKeyAction(press("KeyQ", "ㅂ"), 12)).toEqual({
      kind: "tile",
      index: 0,
    });
  });

  it("판에 없는 칸의 키와 자판 세 줄 밖의 키는 받지 않는다", () => {
    expect(matchKeyAction(press("KeyV", "v"), 8)).toBeNull();
    expect(matchKeyAction(press("KeyT", "t"), 12)).toBeNull();
    expect(matchKeyAction(press("Space", " "), 12)).toBeNull();
  });

  it("Esc는 고른 칸을 푼다", () => {
    expect(matchKeyAction(press("Escape", "Escape"), 12)).toEqual({
      kind: "cancel",
    });
  });

  it("Ctrl·Cmd와 함께 누른 키나 글 쓰는 칸에서 누른 키는 받지 않는다(복사·붙여넣기를 막지 않게)", () => {
    expect(
      matchKeyAction(press("KeyC", "c", { metaKey: true }), 12),
    ).toBeNull();
    expect(
      matchKeyAction(
        press("KeyQ", "q", {
          target: { tag: "INPUT", type: "text", editable: false },
        }),
        12,
      ),
    ).toBeNull();
  });
});
