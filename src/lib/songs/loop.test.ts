import { describe, expect, it } from "vitest";
import { inLoop, LOOP_OFF, loopRange } from "./loop";

const lines = [{ start: 2 }, { start: 6 }, { start: 10 }, {}];

describe("loopRange", () => {
  it("끄면 구간이 없다", () => {
    expect(loopRange(lines, LOOP_OFF)).toBeNull();
  });

  it("한 줄이면 그 줄 시작부터 다음 줄 시작까지", () => {
    expect(loopRange(lines, { kind: "line", index: 1 })).toEqual({
      start: 6,
      end: 10,
    });
  });

  it("구간이면 앞 줄 시작부터 뒤 줄 끝까지(뒤 줄 끝을 모르면 노래 길이)", () => {
    expect(loopRange(lines, { kind: "range", from: 0, to: 2 }, 40)).toEqual({
      start: 2,
      end: 40,
    });
  });

  it("시작을 모르는 줄은 반복할 수 없다", () => {
    expect(loopRange(lines, { kind: "line", index: 3 }, 40)).toBeNull();
  });
});

describe("inLoop", () => {
  it("구간 양 끝 줄을 포함하고, 차례를 거꾸로 골라도 같다", () => {
    const choice = { kind: "range", from: 2, to: 1 } as const;
    expect([0, 1, 2, 3].map((i) => inLoop(choice, i))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it("한 줄 반복은 그 줄만", () => {
    expect(inLoop({ kind: "line", index: 0 }, 0)).toBe(true);
    expect(inLoop({ kind: "line", index: 0 }, 1)).toBe(false);
    expect(inLoop(LOOP_OFF, 0)).toBe(false);
  });
});
