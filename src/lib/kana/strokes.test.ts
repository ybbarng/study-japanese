import { describe, expect, it } from "vitest";
import { strokeCounts } from "./strokes";

describe("가나 획 수", () => {
  it("교과서 획 수를 첫 값으로 준다", () => {
    expect(strokeCounts("あ")).toEqual([3]);
    expect(strokeCounts("ネ")).toEqual([4]);
  });

  it("손으로 쓸 때 갈리는 글자는 두 획 수를 다 받는다", () => {
    expect(strokeCounts("き")).toEqual([4, 3]);
  });

  it("탁점은 2획, 반탁점은 1획을 더한다", () => {
    expect(strokeCounts("が")).toEqual([5]);
    expect(strokeCounts("ぱ")).toEqual([4]);
    expect(strokeCounts("ヴ")).toEqual([5]);
  });

  it("요음은 두 글자 획 수를 더하고 작은 글자는 큰 글자와 같다", () => {
    expect(strokeCounts("きゃ")).toEqual([7, 6]);
    expect(strokeCounts("ショ")).toEqual([6]);
  });

  it("모르는 글자가 섞이면 빈 배열", () => {
    expect(strokeCounts("日")).toEqual([]);
  });
});
