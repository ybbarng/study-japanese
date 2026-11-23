import { describe, expect, it } from "vitest";
import { stickyMaxHeight } from "./sticky";

describe("따라오는 곁칸의 최대 높이", () => {
  it("내리기 전(칸이 머리글 아래에 있을 때)에는 그 위치부터 막대 위까지만 쓴다", () => {
    expect(
      stickyMaxHeight({
        viewport: 900,
        panelTop: 200,
        stickyTop: 24,
        barTop: 820,
      }),
    ).toBe(604);
  });

  it("붙은 뒤에는 붙는 위치부터 막대 위까지 쓴다", () => {
    expect(
      stickyMaxHeight({
        viewport: 900,
        panelTop: 24,
        stickyTop: 24,
        barTop: 820,
      }),
    ).toBe(780);
  });

  it("막대가 없으면 화면 끝 위에 작은 틈을 두고 쓴다", () => {
    expect(
      stickyMaxHeight({
        viewport: 900,
        panelTop: 24,
        stickyTop: 24,
        barTop: null,
      }),
    ).toBe(852);
  });

  it("화면이 아주 낮아도 칸 높이는 아래 한계 밑으로 내려가지 않는다", () => {
    expect(
      stickyMaxHeight({
        viewport: 300,
        panelTop: 250,
        stickyTop: 24,
        barTop: 220,
      }),
    ).toBe(160);
  });
});
