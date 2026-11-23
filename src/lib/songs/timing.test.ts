import { describe, expect, it } from "vitest";
import {
  formatLineTime,
  lineEnd,
  lineIndexAt,
  loopBackTo,
  rangeOf,
  timedCount,
  timingIssues,
} from "./timing";

const lines = [
  { start: 2 },
  { start: 6 },
  {},
  { start: 14, end: 18 },
  { start: 22 },
];

describe("lineEnd", () => {
  it("끝 시각이 없으면 뒤에서 처음 시각이 있는 줄의 시작에서 끝난다", () => {
    expect(lineEnd(lines, 1)).toBe(14);
  });

  it("끝 시각을 따로 적었으면 그 시각", () => {
    expect(lineEnd(lines, 3)).toBe(18);
  });

  it("마지막 줄은 노래 길이에서 끝나고, 길이를 모르면 null", () => {
    expect(lineEnd(lines, 4, 30)).toBe(30);
    expect(lineEnd(lines, 4)).toBeNull();
  });
});

describe("lineIndexAt", () => {
  it("첫 줄 시작 전은 -1", () => {
    expect(lineIndexAt(lines, 1.9)).toBe(-1);
  });

  it("시작 시각이 지난 줄 중 가장 늦게 시작한 줄", () => {
    expect(lineIndexAt(lines, 2)).toBe(0);
    expect(lineIndexAt(lines, 13.9)).toBe(1);
    expect(lineIndexAt(lines, 25)).toBe(4);
  });

  it("끝 시각을 적은 줄이 끝난 뒤(간주)는 -1", () => {
    expect(lineIndexAt(lines, 17.9)).toBe(3);
    expect(lineIndexAt(lines, 18)).toBe(-1);
  });

  it("시각을 맞춘 줄이 없으면 -1", () => {
    expect(lineIndexAt([{}, {}], 5)).toBe(-1);
  });
});

describe("rangeOf", () => {
  it("한 줄이면 그 줄의 시작부터 끝까지", () => {
    expect(rangeOf(lines, 0, 0)).toEqual({ start: 2, end: 6 });
  });

  it("여러 줄이면 앞 줄 시작부터 뒤 줄 끝까지(차례를 거꾸로 줘도 같다)", () => {
    expect(rangeOf(lines, 3, 1)).toEqual({ start: 6, end: 18 });
  });

  it("시작 시각을 모르는 줄에서 시작하면 null", () => {
    expect(rangeOf(lines, 2, 3)).toBeNull();
  });
});

describe("loopBackTo", () => {
  const range = { start: 6, end: 14 };

  it("구간 끝에 닿으면 구간 시작으로 돌아간다", () => {
    expect(loopBackTo(range, 14.1)).toBe(6);
  });

  it("구간 안이면 그대로 둔다", () => {
    expect(loopBackTo(range, 13.9)).toBeNull();
  });

  it("반복하지 않으면 아무것도 하지 않는다", () => {
    expect(loopBackTo(null, 99)).toBeNull();
  });
});

describe("timingIssues", () => {
  it("앞 줄보다 늦지 않게 시작하는 줄을 찾는다", () => {
    expect(
      timingIssues([
        { start: 5 },
        { start: 3 },
        {},
        { start: 5 },
        { start: 8 },
      ]),
    ).toEqual([1, 3]);
  });
});

describe("timedCount·formatLineTime", () => {
  it("시각을 맞춘 줄을 센다", () => {
    expect(timedCount(lines)).toBe(4);
  });

  it("분:초.십분의일초로 쓰고 모르면 --:--", () => {
    expect(formatLineTime(67.34)).toBe("1:07.3");
    expect(formatLineTime(undefined)).toBe("--:--");
  });
});
