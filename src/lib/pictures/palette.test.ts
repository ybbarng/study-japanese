import { describe, expect, it } from "vitest";
import { BACKGROUNDS, contrast, PALETTE } from "./palette";

describe("PALETTE", () => {
  it("윤곽선 색은 어두운 바탕·밝은 바탕 모두와 3:1 넘게 대비된다", () => {
    expect(contrast(PALETTE.line, BACKGROUNDS.dark)).toBeGreaterThan(3);
    expect(contrast(PALETTE.line, BACKGROUNDS.light)).toBeGreaterThan(3);
  });

  it("눈 점 말고는 어두운 바탕에서 사라지는 색이 없다(대비 1.8 이상)", () => {
    const faint = Object.entries(PALETTE)
      .filter(([name]) => name !== "eye")
      .filter(([, hex]) => contrast(hex, BACKGROUNDS.dark) < 1.8)
      .map(([name]) => name);
    expect(faint).toEqual([]);
  });

  it("눈 점 색은 피부색 위에서 또렷하다", () => {
    expect(contrast(PALETTE.eye, PALETTE.skin)).toBeGreaterThan(7);
  });

  it("색 값은 모두 소문자 #rrggbb", () => {
    const bad = Object.values(PALETTE).filter((h) => !/^#[0-9a-f]{6}$/.test(h));
    expect(bad).toEqual([]);
  });
});
