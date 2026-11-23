import { describe, expect, it } from "vitest";
import { nextIndex, prevAction, shadowGapSec, type Track } from "./queue";

const example: Track = {
  book: "ilmuta",
  item: "01-1",
  kind: "example",
  src: "/media/ilmuta/2.%20예문%20mp3/01-1.mp3",
  title: "1강 예문 1",
};
const lecture: Track = {
  ...example,
  item: "L01",
  kind: "lecture",
  title: "1강 강의",
};

describe("nextIndex", () => {
  it("다음 트랙으로 간다", () => {
    expect(nextIndex(0, 6, "off")).toBe(1);
  });
  it("마지막 트랙이 끝나면 멈춘다", () => {
    expect(nextIndex(5, 6, "off")).toBeNull();
  });
  it("전체 반복이면 처음으로 돌아간다", () => {
    expect(nextIndex(5, 6, "all")).toBe(0);
  });
  it("한 곡 반복이면 같은 트랙", () => {
    expect(nextIndex(2, 6, "one")).toBe(2);
  });
});

describe("prevAction", () => {
  it("3초 넘게 들었으면 처음부터 다시", () => {
    expect(prevAction(2, 10)).toEqual({ restart: true });
  });
  it("막 시작했으면 앞 트랙으로", () => {
    expect(prevAction(2, 1)).toEqual({ index: 1 });
  });
  it("첫 트랙에서는 처음부터 다시", () => {
    expect(prevAction(0, 1)).toEqual({ restart: true });
  });
});

describe("shadowGapSec", () => {
  it("예문은 길이에 여유를 더한 만큼 쉰다", () => {
    expect(shadowGapSec(example, 4.2, true)).toBeCloseTo(5);
  });
  it("짧은 예문도 최소 2초, 긴 예문은 최대 20초", () => {
    expect(shadowGapSec(example, 0.5, true)).toBe(2);
    expect(shadowGapSec(example, 35, true)).toBe(20);
  });
  it("강의나 꺼 둔 경우에는 쉬지 않는다", () => {
    expect(shadowGapSec(lecture, 500, true)).toBe(0);
    expect(shadowGapSec(example, 4, false)).toBe(0);
  });
});
