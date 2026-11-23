import { describe, expect, it } from "vitest";
import { nowParamAllowed, resolveNow } from "./now";

const REAL = Date.UTC(2026, 10, 23, 3, 0); // 서울 2026-11-23 12:00
const JAN1_8AM = Date.UTC(2026, 11, 31, 23, 0); // 서울 2027-01-01 08:00

describe("nowParamAllowed", () => {
  it("운영(production)에서는 시각 넣기를 받지 않는다", () => {
    expect(nowParamAllowed({ NODE_ENV: "production" })).toBe(false);
  });

  it("개발 서버에서는 받는다", () => {
    expect(nowParamAllowed({ NODE_ENV: "development" })).toBe(true);
  });

  it("운영 빌드라도 E2E가 ALLOW_NOW_PARAM=1을 주면 받는다", () => {
    expect(
      nowParamAllowed({ NODE_ENV: "production", ALLOW_NOW_PARAM: "1" }),
    ).toBe(true);
  });
});

describe("resolveNow", () => {
  it("받을 수 있으면 넣은 시각을 쓴다", () => {
    expect(resolveNow("2027-01-01T08:00+09:00", REAL, true)).toBe(JAN1_8AM);
  });

  it("쿼리에서 +가 빈칸으로 풀려 와도 시간대로 읽는다", () => {
    expect(resolveNow("2027-01-01T08:00 09:00", REAL, true)).toBe(JAN1_8AM);
  });

  it("받을 수 없으면 넣은 시각을 무시하고 실제 시각을 쓴다", () => {
    expect(resolveNow("2027-01-01T08:00+09:00", REAL, false)).toBe(REAL);
  });

  it("읽을 수 없는 값이면 실제 시각을 쓴다", () => {
    expect(resolveNow("내일", REAL, true)).toBe(REAL);
    expect(resolveNow(["a", "b"], REAL, true)).toBe(REAL);
  });
});
