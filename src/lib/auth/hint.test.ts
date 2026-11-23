import { describe, expect, it } from "vitest";
import { hasAdminHint } from "./hint";

describe("hasAdminHint", () => {
  it("관리자 표시 쿠키가 있으면 true", () => {
    expect(hasAdminHint("sj-player=x; sj_admin=1; other=2")).toBe(true);
  });

  it("값이 다르거나 이름이 비슷하면 false", () => {
    expect(hasAdminHint("sj_admin=0")).toBe(false);
    expect(hasAdminHint("xsj_admin=1")).toBe(false);
    expect(hasAdminHint("")).toBe(false);
  });
});
