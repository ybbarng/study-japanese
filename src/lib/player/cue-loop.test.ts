import { describe, expect, it } from "vitest";
import {
  type CueLoop,
  cueLoopStep,
  loopPauseSec,
  toggleLoop,
} from "./cue-loop";

const loop: CueLoop = { book: "ilmuta", item: "L03", start: 10, end: 14 };
const at = (pos: number, item = "L03") => ({ book: "ilmuta", item, pos });

describe("한 문장 반복의 다음 일", () => {
  it("반복이 없으면 아무것도 하지 않는다", () => {
    expect(cueLoopStep(null, at(20), false)).toEqual({ kind: "none" });
  });

  it("문장 안에서는 그대로 듣는다", () => {
    expect(cueLoopStep(loop, at(12), false)).toEqual({ kind: "none" });
  });

  it("문장 끝에 닿으면 처음으로 돌아간다(간격을 껐으면 쉬지 않고)", () => {
    expect(cueLoopStep(loop, at(14.2), false)).toEqual({
      kind: "back",
      pauseSec: 0,
    });
  });

  it("따라 말하기 간격을 켰으면 문장 길이만큼 쉬었다가 돌아간다", () => {
    expect(cueLoopStep(loop, at(14), true)).toEqual({
      kind: "back",
      pauseSec: 4.8,
    });
  });

  it("다른 곳으로 옮겨 가면 반복을 푼다", () => {
    expect(cueLoopStep(loop, at(30), false)).toEqual({ kind: "clear" });
    expect(cueLoopStep(loop, at(2), false)).toEqual({ kind: "clear" });
  });

  it("다른 트랙으로 넘어가면 반복을 푼다", () => {
    expect(cueLoopStep(loop, at(12, "L04"), false)).toEqual({ kind: "clear" });
  });
});

describe("쉬는 시간", () => {
  it("아주 짧은 문장도 1.5초, 아주 긴 문장도 15초까지", () => {
    expect(loopPauseSec({ ...loop, end: 10.2 }, true)).toBe(1.5);
    expect(loopPauseSec({ ...loop, end: 60 }, true)).toBe(15);
  });
});

describe("반복 켜고 끄기", () => {
  it("같은 문장을 다시 누르면 풀고, 다른 문장이면 옮긴다", () => {
    expect(toggleLoop(loop, { ...loop })).toBeNull();
    const other = { ...loop, start: 20, end: 22 };
    expect(toggleLoop(loop, other)).toEqual(other);
    expect(toggleLoop(null, loop)).toEqual(loop);
  });
});
