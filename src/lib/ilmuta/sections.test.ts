import { describe, expect, it } from "vitest";
import { currentSection } from "./sections";

describe("지금 읽는 구역", () => {
  it("기준선을 넘어선 마지막 구역", () => {
    expect(currentSection([-900, -200, 150, 900], 200)).toBe(2);
  });

  it("맨 위에서는 첫 구역", () => {
    expect(currentSection([300, 1200], 200)).toBe(0);
  });

  it("끝까지 내렸으면 짧은 끝 구역", () => {
    expect(currentSection([-900, -200, 500], 200, true)).toBe(2);
  });

  it("구역이 없으면 -1", () => {
    expect(currentSection([], 200)).toBe(-1);
  });
});
