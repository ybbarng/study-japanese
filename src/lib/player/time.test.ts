import { describe, expect, it } from "vitest";
import { clock, progressOf } from "./time";

describe("clock", () => {
  it("분:초 두 자리로 쓴다", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(65.9)).toBe("1:05");
    expect(clock(1234)).toBe("20:34");
  });

  it("길이를 모르면 자리만 둔다", () => {
    expect(clock(Number.NaN)).toBe("--:--");
  });
});

describe("progressOf", () => {
  it("트랙 길이에 대한 위치 비율이다", () => {
    expect(progressOf(30, 120, null)).toBe(0.25);
  });

  it("따라 말하기 간격 중이면 간격 길이로 잰다", () => {
    expect(progressOf(1, 4, 2)).toBe(0.5);
  });

  it("길이를 아직 모르면 0이다", () => {
    expect(progressOf(10, Number.NaN, null)).toBe(0);
  });
});
