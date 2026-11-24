import { describe, expect, it } from "vitest";
import { nextCollapse } from "./collapse";

const open = { collapsed: false, anchorY: 0 };

describe("위에 붙은 재생기 접기", () => {
  it("아래로 읽어 내려가면 접는다", () => {
    expect(nextCollapse(open, 400)).toEqual({ collapsed: true, anchorY: 400 });
  });

  it("위로 올리면 편다", () => {
    expect(nextCollapse({ collapsed: true, anchorY: 800 }, 700)).toEqual({
      collapsed: false,
      anchorY: 700,
    });
  });

  it("조금 흔들린 것(12px 안)으로는 바꾸지 않는다", () => {
    const s = { collapsed: true, anchorY: 800 };
    expect(nextCollapse(s, 792)).toBe(s);
  });

  it("맨 위 근처에서는 아래로 움직여도 펴 둔다", () => {
    expect(nextCollapse(open, 60).collapsed).toBe(false);
  });
});
