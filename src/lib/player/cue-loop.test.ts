import { describe, expect, it } from "vitest";
import {
  type CueLoop,
  cueLoopStep,
  loopPauseSec,
  resolveLoopCue,
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

describe("반복이 잡을 문장", () => {
  // 짧은 문장이 이어지는 단어·예문 구간처럼: 2초짜리 문장이 0.4초 틈을 두고 이어진다
  const cues = [
    { start: 295.5, end: 297.5 },
    { start: 297.9, end: 299.9 },
    { start: 300.3, end: 302.3 },
  ];

  it("문장 한가운데서 누르면 그 문장", () => {
    expect(resolveLoopCue(cues, 298.9)).toBe(1);
  });

  it("다음 문장이 시작된 지 0.8초 안에 누르면 화면에 보이던 앞 문장", () => {
    expect(resolveLoopCue(cues, 298.2)).toBe(0);
    expect(resolveLoopCue(cues, 298.2, { pressed: 1 })).toBe(0);
  });

  it("앞 문장이 끝난 뒤 오래 비었으면 막 시작한 문장", () => {
    const gap = [
      { start: 10, end: 12 },
      { start: 20, end: 22 },
    ];
    expect(resolveLoopCue(gap, 20.2)).toBe(1);
  });

  it("자막 줄을 눌러 옮긴 직후에는 그 줄(재생 위치가 줄 시작보다 조금 앞이어도)", () => {
    const seek = { sec: 297.9, ageSec: 0.3 };
    expect(resolveLoopCue(cues, 297.85, { seek })).toBe(1);
    expect(resolveLoopCue(cues, 298.2, { seek, pressed: 1 })).toBe(1);
  });

  it("옮긴 지 오래됐으면 옮긴 줄을 기억하지 않는다", () => {
    expect(
      resolveLoopCue(cues, 300.5, { seek: { sec: 297.9, ageSec: 10 } }),
    ).toBe(1);
  });

  it("지금 줄이 아닌 줄의 단추를 누르면 그 줄", () => {
    expect(resolveLoopCue(cues, 301, { pressed: 0 })).toBe(0);
  });

  it("첫 줄보다 앞이면 잡을 것이 없다", () => {
    expect(resolveLoopCue(cues, 100)).toBe(-1);
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
