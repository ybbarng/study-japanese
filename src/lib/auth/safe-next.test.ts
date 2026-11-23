import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("사이트 안 경로는 그대로 둔다", () => {
    expect(safeNextPath("/ilmuta/3?tab=examples")).toBe(
      "/ilmuta/3?tab=examples",
    );
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "ilmuta",
    "",
  ])("다른 사이트로 갈 수 있는 %j는 첫 화면으로 바꾼다", (next) => {
    expect(safeNextPath(next)).toBe("/");
  });

  it("로그인 화면이나 API로 돌아가지 않는다", () => {
    expect(safeNextPath("/login?next=/")).toBe("/");
    expect(safeNextPath("/api/login")).toBe("/");
  });
});
