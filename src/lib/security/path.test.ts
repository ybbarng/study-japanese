import { describe, expect, it } from "vitest";
import { isDecodablePath } from "./path";

describe("isDecodablePath", () => {
  it("한글을 %인코딩한 교재 오디오 경로는 풀린다", () => {
    expect(
      isDecodablePath("/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1/L01.mp3"),
    ).toBe(true);
  });

  it.each(["/media/ilmuta/%E0%A4%A", "/api/state/%", "/ilmuta/%ZZ"])(
    "깨진 %%인코딩 %s는 풀리지 않는다",
    (p) => {
      expect(isDecodablePath(p)).toBe(false);
    },
  );
});
