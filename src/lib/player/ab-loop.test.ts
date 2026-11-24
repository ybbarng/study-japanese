import { describe, expect, it } from "vitest";
import { type AbLoop, abLoopStep, nextAbLoop } from "./ab-loop";

const at = (pos: number, item = "L03") => ({ book: "ilmuta", item, pos });

describe("A–B 단추를 누를 때", () => {
  it("처음 누르면 지금 위치를 시작(A)으로 찍는다", () => {
    expect(nextAbLoop(null, at(10))).toEqual({
      book: "ilmuta",
      item: "L03",
      a: 10,
      b: null,
    });
  });

  it("두 번째로 누르면 끝(B)을 찍고, 세 번째면 푼다", () => {
    const a = nextAbLoop(null, at(10));
    const ab = nextAbLoop(a, at(14.5));
    expect(ab).toEqual({ book: "ilmuta", item: "L03", a: 10, b: 14.5 });
    expect(nextAbLoop(ab, at(12))).toBeNull();
  });

  it("A보다 앞에서 B를 찍으면 둘을 바꾼다", () => {
    const a = nextAbLoop(null, at(10));
    expect(nextAbLoop(a, at(6))).toMatchObject({ a: 6, b: 10 });
  });

  it("A를 찍자마자 다시 누른 것(0.3초 안)은 B로 찍지 않는다", () => {
    const a = nextAbLoop(null, at(10));
    expect(nextAbLoop(a, at(10.1))).toEqual(a);
  });

  it("다른 트랙에서 누르면 그 트랙에서 새로 A를 찍는다", () => {
    const ab: AbLoop = { book: "ilmuta", item: "L03", a: 1, b: 2 };
    expect(nextAbLoop(ab, at(5, "03-2"))).toMatchObject({
      item: "03-2",
      a: 5,
      b: null,
    });
  });
});

describe("A–B 반복 중 재생 위치가 바뀔 때", () => {
  const ab: AbLoop = { book: "ilmuta", item: "L03", a: 10, b: 14 };

  it("구간 안에서는 그대로 듣는다", () => {
    expect(abLoopStep(ab, at(12))).toEqual({ kind: "none" });
  });

  it("B에 닿으면 A로 돌아간다", () => {
    expect(abLoopStep(ab, at(14.1))).toEqual({ kind: "back", to: 10 });
  });

  it("B를 한참 넘어 옮겨 가거나 다른 트랙으로 넘어가면 푼다", () => {
    expect(abLoopStep(ab, at(30))).toEqual({ kind: "clear" });
    expect(abLoopStep(ab, at(12, "03-2"))).toEqual({ kind: "clear" });
  });

  it("A만 찍은 동안에는 아무것도 하지 않는다", () => {
    expect(abLoopStep({ ...ab, b: null }, at(40))).toEqual({ kind: "none" });
  });
});
